import { createRoot } from 'react-dom/client';
import { Evaluation, PositionFormConfig, CriteriaScore, WEIGHTING_SCHEMES } from '../types';
import { getVisibleColumns, calculateOverallScore } from './rbac';
import { format } from 'date-fns';

interface PdfReportData {
  evaluation: Evaluation;
  positionFormConfig?: PositionFormConfig | null;
}

function getRating(score: number) {
  if (score >= 95) return { label: 'Outstanding', kh: 'ល្អប្រសើរបំផុត', color: '#059669', bg: '#d1fae5' };
  if (score >= 85) return { label: 'Excellent', kh: 'ល្អ', color: '#2563eb', bg: '#dbeafe' };
  if (score >= 70) return { label: 'Very Good', kh: 'ល្អបង្គួរ', color: '#7c3aed', bg: '#ede9fe' };
  if (score >= 60) return { label: 'Good', kh: 'មធ្យម', color: '#d97706', bg: '#fef3c7' };
  return { label: 'Needs Improvement', kh: 'ត្រូវកែលម្អ', color: '#dc2626', bg: '#fee2e2' };
}

function getWeightLabel(scheme: string) {
  const found = WEIGHTING_SCHEMES.find(w => w.id === scheme);
  return found ? found.label : scheme;
}

function buildHtml(data: PdfReportData): string {
  const { evaluation: ev, positionFormConfig } = data;
  const now = format(new Date(), 'dd MMMM yyyy, hh:mm a');
  const rating = getRating(ev.overallScore);
  const cols = getVisibleColumns(ev.weightScheme);

  const sections = positionFormConfig?.sections
    ?.filter(s => s.status === 'active')
    ?.sort((a, b) => a.displayOrder - b.displayOrder) || [];

  const criteria = positionFormConfig?.criteria
    ?.filter(c => c.status === 'active')
    ?.sort((a, b) => a.displayOrder - b.displayOrder) || [];

  const maxPossible = criteria.reduce((sum, c) => sum + (c.max || 10), 0);

  const sectionData = sections.map(sec => {
    const secCriteria = criteria.filter(c => c.sectionId === sec.id);
    const secScores = secCriteria.map(c => {
      const cs = (ev.criteriaScores || []).find(s => s.criteriaId === c.id);
      return { criterion: c, score: cs };
    });
    const totalSuper = secScores.reduce((s, x) => s + (x.score?.superScore || 0), 0);
    const totalSelf = secScores.reduce((s, x) => s + (x.score?.selfScore || 0), 0);
    const totalSupporter = secScores.reduce((s, x) => s + (x.score?.supporterScore || 0), 0);
    const totalManagement = secScores.reduce((s, x) => s + (x.score?.managementScore || 0), 0);
    const secMax = secCriteria.reduce((s, c) => s + (c.max || 10), 0);
    const secPct = secMax > 0 ? ((totalSuper / secMax) * 100 * (sec.weight / 100)) : 0;
    return { sec, secCriteria, secScores, totalSuper, totalSelf, totalSupporter, totalManagement, secMax, secPct };
  });

  const overallPct = maxPossible > 0 ? ((ev.overallScore / 100) * 100) : ev.overallScore;

  const showSuper = cols.super;
  const showSupporter = cols.supporter;
  const showManagement = cols.management;
  const colCount = 3 + (showSuper ? 1 : 0) + (showSupporter ? 1 : 0) + (showManagement ? 1 : 0) + 1;

  const barChartHtml = sectionData.map((sd, i) => {
    const pct = sd.secMax > 0 ? (sd.totalSuper / sd.secMax * 100) : 0;
    const barW = Math.max(2, Math.min(100, pct));
    const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
    const color = colors[i % colors.length];
    return `<div style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:11px;font-weight:600;color:#334155;">${sd.sec.khName} / ${sd.sec.name}</span>
        <span style="font-size:11px;font-weight:700;color:${color};">${pct.toFixed(1)}%</span>
      </div>
      <div style="background:#e2e8f0;border-radius:6px;height:20px;overflow:hidden;">
        <div style="width:${barW}%;height:100%;background:${color};border-radius:6px;transition:width 0.3s;"></div>
      </div>
      <div style="font-size:10px;color:#64748b;margin-top:2px;">Weight: ${sd.sec.weight}% | Score: ${sd.totalSuper.toFixed(1)} / ${sd.secMax}</div>
    </div>`;
  }).join('');

  const radarSize = 200;
  const radarCenter = radarSize / 2;
  const radarRadius = 70;
  const radarLabels = sectionData.map(sd => sd.sec.khName);
  const radarValues = sectionData.map(sd => sd.secMax > 0 ? (sd.totalSuper / sd.secMax) : 0);
  const radarCount = radarLabels.length;

  function radarPoint(i: number, r: number) {
    const angle = (Math.PI * 2 * i) / radarCount - Math.PI / 2;
    return { x: radarCenter + r * Math.cos(angle), y: radarCenter + r * Math.sin(angle) };
  }

  let radarSvg = `<svg width="${radarSize}" height="${radarSize}" viewBox="0 0 ${radarSize} ${radarSize}" style="display:block;margin:0 auto;">`;
  for (let ring = 1; ring <= 4; ring++) {
    const r = (radarRadius * ring) / 4;
    const pts = Array.from({ length: radarCount }, (_, i) => radarPoint(i, r));
    radarSvg += `<polygon points="${pts.map(p => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="#cbd5e1" stroke-width="0.5"/>`;
  }
  for (let i = 0; i < radarCount; i++) {
    const p1 = radarPoint(i, radarRadius);
    radarSvg += `<line x1="${radarCenter}" y1="${radarCenter}" x2="${p1.x}" y2="${p1.y}" stroke="#cbd5e1" stroke-width="0.5"/>`;
    const lp = radarPoint(i, radarRadius + 18);
    radarSvg += `<text x="${lp.x}" y="${lp.y}" text-anchor="middle" dominant-baseline="middle" style="font-size:8px;fill:#475569;font-weight:600;">${radarLabels[i]}</text>`;
  }
  if (radarCount > 2) {
    const dataPts = radarValues.map((v, i) => radarPoint(i, radarRadius * Math.min(1, v)));
    radarSvg += `<polygon points="${dataPts.map(p => `${p.x},${p.y}`).join(' ')}" fill="rgba(99,102,241,0.2)" stroke="#6366f1" stroke-width="1.5"/>`;
    dataPts.forEach(p => {
      radarSvg += `<circle cx="${p.x}" cy="${p.y}" r="3" fill="#6366f1"/>`;
    });
  }
  radarSvg += `</svg>`;

  const gaugeScore = ev.overallScore;
  const gaugeAngle = (gaugeScore / 100) * 180;
  const gaugeStart = { x: 50, y: 85 };
  const gaugeRadius = 40;
  function gaugeArc(angle: number) {
    const rad = (Math.PI * (180 - angle)) / 180;
    return { x: gaugeStart.x + gaugeRadius * Math.cos(rad), y: gaugeStart.y - gaugeRadius * Math.sin(rad) };
  }
  const arcEnd = gaugeArc(gaugeAngle);
  const largeArc = gaugeAngle > 180 ? 1 : 0;

  const gaugeSvg = `<svg width="120" height="80" viewBox="0 0 100 70" style="display:block;margin:0 auto;">
    <path d="M 10 60 A 40 40 0 0 1 90 60" fill="none" stroke="#e2e8f0" stroke-width="8" stroke-linecap="round"/>
    <path d="M 10 60 A 40 40 0 ${largeArc} 1 ${arcEnd.x} ${arcEnd.y}" fill="none" stroke="${rating.color}" stroke-width="8" stroke-linecap="round"/>
    <text x="50" y="55" text-anchor="middle" style="font-size:18px;font-weight:800;fill:${rating.color};">${gaugeScore.toFixed(1)}</text>
    <text x="50" y="66" text-anchor="middle" style="font-size:6px;fill:#64748b;font-weight:600;">/ 100</text>
  </svg>`;

  const tableRows = sectionData.flatMap(sd =>
    sd.secScores.map((item, idx) => {
      const c = item.criterion;
      const s = item.score;
      const weighted = s ? ((s.superScore || 0) / (c.max || 10) * 100) : 0;
      const rowBg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
      return `<tr style="background:${rowBg};">
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;color:#475569;">${idx + 1}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">
          <div style="font-size:11px;font-weight:600;color:#1e293b;">${c.kh}</div>
          <div style="font-size:10px;color:#64748b;">${c.en}</div>
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:11px;font-weight:700;color:#6366f1;">${s?.selfScore ?? '—'}</td>
        ${showSuper ? `<td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:11px;font-weight:700;color:#8b5cf6;">${s?.superScore ?? '—'}</td>` : ''}
        ${showSupporter ? `<td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:11px;font-weight:700;color:#06b6d4;">${s?.supporterScore ?? '—'}</td>` : ''}
        ${showManagement ? `<td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:11px;font-weight:700;color:#f59e0b;">${s?.managementScore ?? '—'}</td>` : ''}
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:11px;font-weight:700;color:#10b981;">${weighted.toFixed(1)}%</td>
      </tr>`;
    })
  ).join('');

  const sectionHeaderRows = sectionData.map(sd => {
    const secPct = sd.secMax > 0 ? (sd.totalSuper / sd.secMax * 100) : 0;
    return `<tr style="background:#f1f5f9;">
      <td colspan="${colCount}" style="padding:10px 12px;border-bottom:2px solid #6366f1;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <span style="font-size:12px;font-weight:700;color:#1e293b;">${sd.sec.khName} / ${sd.sec.name}</span>
            <span style="font-size:10px;color:#64748b;margin-left:8px;">Weight: ${sd.sec.weight}%</span>
          </div>
          <div style="font-size:12px;font-weight:800;color:${rating.color};">Score: ${sd.totalSuper.toFixed(1)} / ${sd.secMax} (${secPct.toFixed(1)}%)</div>
        </div>
      </td>
    </tr>`;
  }).join('');

  const colHeaders = `<tr style="background:#6366f1;">
    <th style="padding:10px 12px;color:white;font-size:10px;font-weight:700;text-align:left;width:30px;">#</th>
    <th style="padding:10px 12px;color:white;font-size:10px;font-weight:700;text-align:left;">Criteria / មាតិកា</th>
    <th style="padding:10px 12px;color:white;font-size:10px;font-weight:700;text-align:center;">Self</th>
    ${showSuper ? `<th style="padding:10px 12px;color:white;font-size:10px;font-weight:700;text-align:center;">Supervisor</th>` : ''}
    ${showSupporter ? `<th style="padding:10px 12px;color:white;font-size:10px;font-weight:700;text-align:center;">Supporter</th>` : ''}
    ${showManagement ? `<th style="padding:10px 12px;color:white;font-size:10px;font-weight:700;text-align:center;">Management</th>` : ''}
    <th style="padding:10px 12px;color:white;font-size:10px;font-weight:700;text-align:center;">Weighted</th>
  </tr>`;

  const fullTableHtml = `<table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
    ${colHeaders}
    ${sectionHeaderRows}
    ${tableRows}
  </table>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Inter','Khmer OS','Noto Sans Khmer',sans-serif; background:white; color:#1e293b; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  @page { size:A4 portrait; margin:0; }
  .page { width:210mm; min-height:297mm; padding:15mm 18mm; position:relative; page-break-after:always; overflow:hidden; }
  .page:last-child { page-break-after:auto; }
</style>
</head>
<body>

<!-- ═══════════════ COVER PAGE ═══════════════ -->
<div class="page" style="display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;background:linear-gradient(135deg,#1e1b4b 0%,#312e81 40%,#4338ca 100%);color:white;padding:25mm 20mm;">
  <div style="position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(90deg,#818cf8,#6366f1,#4f46e5,#7c3aed);"></div>
  <div style="position:absolute;bottom:0;left:0;right:0;height:6px;background:linear-gradient(90deg,#818cf8,#6366f1,#4f46e5,#7c3aed);"></div>

  <div style="width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;margin-bottom:24px;border:3px solid rgba(255,255,255,0.3);">
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
  </div>

  <div style="font-size:11px;letter-spacing:4px;text-transform:uppercase;opacity:0.7;margin-bottom:8px;">Western International School</div>
  <div style="width:60px;height:2px;background:rgba(255,255,255,0.4);margin:12px auto;"></div>
  <h1 style="font-size:24px;font-weight:900;letter-spacing:1px;margin-bottom:6px;">Annual Performance Management System</h1>
  <h2 style="font-size:16px;font-weight:700;opacity:0.9;margin-bottom:24px;">Performance Appraisal Report</h2>
  <div style="width:40px;height:1px;background:rgba(255,255,255,0.3);margin:0 auto 20px;"></div>

  <div style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:16px;padding:20px 32px;max-width:380px;width:100%;">
    <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;opacity:0.6;margin-bottom:10px;">Employee</div>
    <div style="font-size:20px;font-weight:800;margin-bottom:4px;">${ev.employeeName}</div>
    <div style="font-size:12px;opacity:0.8;margin-bottom:12px;">${ev.position} — ${ev.department || ''}</div>
    <div style="display:flex;gap:12px;justify-content:center;font-size:10px;opacity:0.7;">
      <span>ID: ${ev.employeeId}</span>
      <span>•</span>
      <span>${ev.campus}</span>
    </div>
  </div>

  <div style="margin-top:32px;font-size:10px;opacity:0.5;">
    Academic Year: ${ev.evalPeriod || '2026'}<br/>
    Report Generated: ${now}
  </div>
</div>

<!-- ═══════════════ EMPLOYEE INFO + SUMMARY ═══════════════ -->
<div class="page" style="padding:15mm 18mm;">
  <div style="text-align:center;margin-bottom:20px;">
    <h2 style="font-size:16px;font-weight:800;color:#1e293b;">Employee Information & Evaluation Summary</h2>
    <div style="width:40px;height:3px;background:#6366f1;margin:8px auto 0;border-radius:2px;"></div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;font-weight:700;margin-bottom:8px;">Employee Details</div>
      <table style="width:100%;font-size:11px;">
        <tr><td style="padding:3px 0;color:#64748b;font-weight:600;width:110px;">Staff ID</td><td style="padding:3px 0;color:#1e293b;font-weight:700;">${ev.employeeId}</td></tr>
        <tr><td style="padding:3px 0;color:#64748b;font-weight:600;">Name</td><td style="padding:3px 0;color:#1e293b;font-weight:700;">${ev.employeeName}</td></tr>
        <tr><td style="padding:3px 0;color:#64748b;font-weight:600;">Position</td><td style="padding:3px 0;color:#1e293b;font-weight:700;">${ev.position}</td></tr>
        <tr><td style="padding:3px 0;color:#64748b;font-weight:600;">Department</td><td style="padding:3px 0;color:#1e293b;font-weight:700;">${ev.department || '—'}</td></tr>
        <tr><td style="padding:3px 0;color:#64748b;font-weight:600;">Campus</td><td style="padding:3px 0;color:#1e293b;font-weight:700;">${ev.campus}</td></tr>
        <tr><td style="padding:3px 0;color:#64748b;font-weight:600;">Supervisor</td><td style="padding:3px 0;color:#1e293b;font-weight:700;">${ev.appraiser || '—'}</td></tr>
      </table>
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;font-weight:700;margin-bottom:8px;">Report Details</div>
      <table style="width:100%;font-size:11px;">
        <tr><td style="padding:3px 0;color:#64748b;font-weight:600;width:110px;">Eval Period</td><td style="padding:3px 0;color:#1e293b;font-weight:700;">${ev.evalPeriod || '2026'}</td></tr>
        <tr><td style="padding:3px 0;color:#64748b;font-weight:600;">Eval Type</td><td style="padding:3px 0;color:#1e293b;font-weight:700;">${ev.evaluationType || '—'}</td></tr>
        <tr><td style="padding:3px 0;color:#64748b;font-weight:600;">Weight Scheme</td><td style="padding:3px 0;color:#1e293b;font-weight:700;">${getWeightLabel(ev.weightScheme)}</td></tr>
        <tr><td style="padding:3px 0;color:#64748b;font-weight:600;">Status</td><td style="padding:3px 0;color:#1e293b;font-weight:700;">${ev.status || '—'}</td></tr>
        <tr><td style="padding:3px 0;color:#64748b;font-weight:600;">Generated By</td><td style="padding:3px 0;color:#1e293b;font-weight:700;">System</td></tr>
        <tr><td style="padding:3px 0;color:#64748b;font-weight:600;">Generated On</td><td style="padding:3px 0;color:#1e293b;font-weight:700;">${now}</td></tr>
      </table>
    </div>
  </div>

  <div style="text-align:center;margin-bottom:20px;">
    <h3 style="font-size:13px;font-weight:800;color:#1e293b;">Evaluation Summary</h3>
    <div style="width:30px;height:2px;background:#6366f1;margin:6px auto 0;border-radius:2px;"></div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;">
    <div style="background:linear-gradient(135deg,#ede9fe,#f5f3ff);border:1px solid #c4b5fd;border-radius:12px;padding:14px 10px;text-align:center;">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#7c3aed;font-weight:700;margin-bottom:6px;">Overall Score</div>
      <div style="font-size:28px;font-weight:900;color:#4f46e5;">${ev.overallScore.toFixed(1)}</div>
      <div style="font-size:9px;color:#64748b;">out of 100</div>
    </div>
    <div style="background:${rating.bg};border:1px solid ${rating.color}33;border-radius:12px;padding:14px 10px;text-align:center;">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:${rating.color};font-weight:700;margin-bottom:6px;">Rating</div>
      <div style="font-size:16px;font-weight:800;color:${rating.color};line-height:1.2;">${rating.label}</div>
      <div style="font-size:9px;color:${rating.color};opacity:0.8;">${rating.kh}</div>
    </div>
    <div style="background:linear-gradient(135deg,#ecfdf5,#f0fdf4);border:1px solid #86efac;border-radius:12px;padding:14px 10px;text-align:center;">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#059669;font-weight:700;margin-bottom:6px;">Percentage</div>
      <div style="font-size:28px;font-weight:900;color:#059669;">${ev.overallScore.toFixed(1)}%</div>
      <div style="font-size:9px;color:#64748b;">completion</div>
    </div>
    <div style="background:linear-gradient(135deg,#fef3c7,#fffbeb);border:1px solid #fcd34d;border-radius:12px;padding:14px 10px;text-align:center;">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#d97706;font-weight:700;margin-bottom:6px;">Status</div>
      <div style="font-size:14px;font-weight:800;color:#d97706;line-height:1.2;">${ev.status || '—'}</div>
      <div style="font-size:9px;color:#64748b;">completion status</div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">
      <div style="font-size:10px;font-weight:700;color:#475569;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Performance Gauge</div>
      ${gaugeSvg}
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">
      <div style="font-size:10px;font-weight:700;color:#475569;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Section Breakdown</div>
      ${barChartHtml}
    </div>
  </div>

  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;text-align:center;">
    <div style="font-size:10px;font-weight:700;color:#475569;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Radar Comparison</div>
    ${radarSvg}
  </div>

  <div style="position:absolute;bottom:10mm;left:18mm;right:18mm;display:flex;justify-content:space-between;font-size:8px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:6px;">
    <span>Western International School — Annual Performance Management System</span>
    <span>Confidential | ${now}</span>
  </div>
</div>

<!-- ═══════════════ EVALUATION TABLE ═══════════════ -->
<div class="page" style="padding:15mm 18mm;">
  <div style="text-align:center;margin-bottom:16px;">
    <h2 style="font-size:16px;font-weight:800;color:#1e293b;">Section-by-Section Evaluation</h2>
    <div style="width:40px;height:3px;background:#6366f1;margin:8px auto 0;border-radius:2px;"></div>
  </div>

  ${fullTableHtml}

  <div style="position:absolute;bottom:10mm;left:18mm;right:18mm;display:flex;justify-content:space-between;font-size:8px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:6px;">
    <span>Western International School — Annual Performance Management System</span>
    <span>Confidential | ${now}</span>
  </div>
</div>

<!-- ═══════════════ COMMENTS + SIGNATURES ═══════════════ -->
<div class="page" style="padding:15mm 18mm;">
  <div style="text-align:center;margin-bottom:20px;">
    <h2 style="font-size:16px;font-weight:800;color:#1e293b;">Comments & Recommendations</h2>
    <div style="width:40px;height:3px;background:#6366f1;margin:8px auto 0;border-radius:2px;"></div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <div style="width:28px;height:28px;border-radius:50%;background:#ede9fe;display:flex;align-items:center;justify-content:center;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:#1e293b;">Employee Self Comments</div>
          <div style="font-size:9px;color:#64748b;">មតិយោបល់របស់បុគ្គលិក</div>
        </div>
      </div>
      <div style="font-size:11px;color:#475569;line-height:1.6;min-height:50px;background:white;border:1px solid #e2e8f0;border-radius:8px;padding:10px;">
        ${ev.evaluatorComments || 'No comments provided.'}
      </div>
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <div style="width:28px;height:28px;border-radius:50%;background:#dbeafe;display:flex;align-items:center;justify-content:center;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:#1e293b;">Supervisor Comments</div>
          <div style="font-size:9px;color:#64748b;">មតិយោបល់របស់អ្នកគ្រប់គ្រង</div>
        </div>
      </div>
      <div style="font-size:11px;color:#475569;line-height:1.6;min-height:50px;background:white;border:1px solid #e2e8f0;border-radius:8px;padding:10px;">
        ${ev.evaluatorComments || 'No supervisor comments provided.'}
      </div>
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <div style="width:28px;height:28px;border-radius:50%;background:#d1fae5;display:flex;align-items:center;justify-content:center;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:#1e293b;">Supporter Comments</div>
          <div style="font-size:9px;color:#64748b;">មតិយោបល់របស់អ្នកគាំទ្រ</div>
        </div>
      </div>
      <div style="font-size:11px;color:#475569;line-height:1.6;min-height:50px;background:white;border:1px solid #e2e8f0;border-radius:8px;padding:10px;">
        No supporter comments provided.
      </div>
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <div style="width:28px;height:28px;border-radius:50%;background:#fef3c7;display:flex;align-items:center;justify-content:center;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:#1e293b;">Management Comments</div>
          <div style="font-size:9px;color:#64748b;">មតិយោបល់របស់ការិយាល័យ</div>
        </div>
      </div>
      <div style="font-size:11px;color:#475569;line-height:1.6;min-height:50px;background:white;border:1px solid #e2e8f0;border-radius:8px;padding:10px;">
        No management comments provided.
      </div>
    </div>
  </div>

  <div style="background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:1px solid #86efac;border-radius:12px;padding:16px;margin-bottom:24px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
      <span style="font-size:12px;font-weight:700;color:#059669;">Final Recommendation</span>
    </div>
    <div style="font-size:11px;color:#475569;line-height:1.6;">
      Based on the evaluation results, the employee has achieved an overall score of <strong>${ev.overallScore.toFixed(1)}</strong> (${rating.label} / ${rating.kh}).
      ${ev.overallScore >= 85 ? 'The employee demonstrates excellent performance and is recommended for recognition.' :
        ev.overallScore >= 70 ? 'The employee shows very good performance with areas for continued growth.' :
        ev.overallScore >= 60 ? 'The employee meets expectations with some areas needing improvement.' :
        'The employee requires targeted support and development in key areas.'}
    </div>
  </div>

  <div style="text-align:center;margin-bottom:16px;">
    <h3 style="font-size:13px;font-weight:800;color:#1e293b;">Approval & Signatures</h3>
    <div style="width:30px;height:2px;background:#6366f1;margin:6px auto 0;border-radius:2px;"></div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;">
    ${[
      { label: 'Employee', kh: 'បុគ្គលិក' },
      { label: 'Supervisor', kh: 'អ្នកគ្រប់គ្រង' },
      { label: 'Supporter', kh: 'អ្នកគាំទ្រ' },
      { label: 'Management', kh: 'ការិយាល័យ' },
      { label: 'HR Office', kh: 'ការិយាល័យធនធានមនុស្ស' }
    ].map(s => `
      <div style="text-align:center;border:1px solid #e2e8f0;border-radius:10px;padding:12px 6px;background:#f8fafc;">
        <div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${s.kh}</div>
        <div style="font-size:10px;font-weight:600;color:#1e293b;margin-bottom:24px;">${s.label}</div>
        <div style="border-top:1px solid #94a3b8;width:80%;margin:0 auto;"></div>
        <div style="font-size:8px;color:#94a3b8;margin-top:4px;">Signature</div>
        <div style="margin-top:8px;border-top:1px solid #94a3b8;width:80%;margin:8px auto 0;"></div>
        <div style="font-size:8px;color:#94a3b8;margin-top:4px;">Date</div>
      </div>
    `).join('')}
  </div>

  <div style="position:absolute;bottom:10mm;left:18mm;right:18mm;display:flex;justify-content:space-between;font-size:8px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:6px;">
    <span>Western International School — Annual Performance Management System</span>
    <span>Confidential | ${now}</span>
  </div>
</div>

</body></html>`;
}

export async function generatePdfReport(data: PdfReportData): Promise<void> {
  const html2pdf = (await import('html2pdf.js')).default;

  const html = buildHtml(data);
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:210mm;background:white;z-index:-1;';
  container.innerHTML = html;
  document.body.appendChild(container);

  await new Promise(r => setTimeout(r, 500));

  const filename = `Performance_Report_${data.evaluation.employeeName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;

  await (html2pdf() as any)
    .set({
      margin: 0,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(container)
    .save();

  document.body.removeChild(container);
}

import { Evaluation, PositionFormConfig, CriteriaScore, WEIGHTING_SCHEMES } from '../types';
import { getVisibleColumns, calculateOverallScore } from './rbac';
import { format } from 'date-fns';

interface PdfReportData {
  evaluation: Evaluation;
  positionFormConfig?: PositionFormConfig | null;
}

function getRating(score: number) {
  if (score >= 95) return { label: 'Outstanding', kh: 'ល្អប្រសើរបំផុត', color: '#059669', bg: '#d1fae5', border: '#86efac' };
  if (score >= 85) return { label: 'Excellent', kh: 'ល្អ', color: '#2563eb', bg: '#dbeafe', border: '#93c5fd' };
  if (score >= 75) return { label: 'Very Good', kh: 'ល្អបង្គួរ', color: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd' };
  if (score >= 60) return { label: 'Good', kh: 'មធ្យម', color: '#d97706', bg: '#fef3c7', border: '#fcd34d' };
  return { label: 'Needs Improvement', kh: 'ត្រូវកែលម្អ', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' };
}

function getWeightLabel(scheme: string) {
  const found = WEIGHTING_SCHEMES.find(w => w.id === scheme);
  return found ? found.label : scheme;
}

function buildHtml(data: PdfReportData, pageNum: number): string {
  const { evaluation: ev, positionFormConfig } = data;
  const now = format(new Date(), 'dd MMMM yyyy');
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
    const totalSelf = secScores.reduce((s, x) => s + (x.score?.selfScore || 0), 0);
    const totalSuper = secScores.reduce((s, x) => s + (x.score?.superScore || 0), 0);
    const totalSupporter = secScores.reduce((s, x) => s + (x.score?.supporterScore || 0), 0);
    const totalManagement = secScores.reduce((s, x) => s + (x.score?.managementScore || 0), 0);
    const secMax = secCriteria.reduce((s, c) => s + (c.max || 10), 0);
    const secPct = secMax > 0 ? ((totalSuper / secMax) * 100 * (sec.weight / 100)) : 0;
    return { sec, secCriteria, secScores, totalSelf, totalSuper, totalSupporter, totalManagement, secMax, secPct };
  });

  const showSuper = cols.super;
  const showSupporter = cols.supporter;
  const showManagement = cols.management;
  const colCount = 3 + (showSuper ? 1 : 0) + (showSupporter ? 1 : 0) + (showManagement ? 1 : 0) + 1;

  const gaugeScore = ev.overallScore;
  const gaugeAngle = (gaugeScore / 100) * 180;
  const gaugeStart = { x: 80, y: 105 };
  const gaugeRadius = 45;
  function gaugeArc(angle: number) {
    const rad = (Math.PI * (180 - angle)) / 180;
    return { x: gaugeStart.x + gaugeRadius * Math.cos(rad), y: gaugeStart.y - gaugeRadius * Math.sin(rad) };
  }
  const arcEnd = gaugeArc(gaugeAngle);
  const largeArc = gaugeAngle > 180 ? 1 : 0;

  const gaugeSvg = `<svg width="160" height="85" viewBox="0 0 160 85" style="display:block;margin:0 auto;">
    <defs>
      <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#dc2626"/>
        <stop offset="40%" stop-color="#d97706"/>
        <stop offset="70%" stop-color="#7c3aed"/>
        <stop offset="100%" stop-color="#059669"/>
      </linearGradient>
    </defs>
    <path d="M 35 75 A 40 40 0 0 1 125 75" fill="none" stroke="#e2e8f0" stroke-width="10" stroke-linecap="round"/>
    <path d="M 35 75 A 40 40 0 ${largeArc} 1 ${arcEnd.x + 0} ${arcEnd.y + 0}" fill="none" stroke="url(#gaugeGrad)" stroke-width="10" stroke-linecap="round"/>
    <text x="80" y="72" text-anchor="middle" style="font-size:26px;font-weight:900;fill:#1e293b;font-family:'Inter',sans-serif;">${gaugeScore.toFixed(1)}</text>
    <text x="80" y="82" text-anchor="middle" style="font-size:7px;fill:#94a3b8;font-weight:600;">/100</text>
  </svg>`;

  const barChartHtml = sectionData.map((sd, i) => {
    const pct = sd.secMax > 0 ? (sd.totalSuper / sd.secMax * 100) : 0;
    const barW = Math.max(2, Math.min(100, pct));
    const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
    const color = colors[i % colors.length];
    return `<div class="bar-row">
      <div class="bar-label">
        <span>${sd.sec.khName}</span>
        <span class="bar-pct" style="color:${color};">${pct.toFixed(1)}%</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${barW}%;background:${color};"></div>
      </div>
      <div class="bar-sub">Score: ${sd.totalSuper.toFixed(1)} / ${sd.secMax} &nbsp;|&nbsp; Weight: ${sd.sec.weight}%</div>
    </div>`;
  }).join('');

  const radarSize = 200;
  const radarCenter = radarSize / 2;
  const radarRadius = 70;
  const radarLabels = sectionData.map(sd => sd.sec.khName.substring(0, 12));
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
    radarSvg += `<polygon points="${pts.map(p => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="#e2e8f0" stroke-width="0.8"/>`;
  }
  for (let i = 0; i < radarCount; i++) {
    const p1 = radarPoint(i, radarRadius);
    radarSvg += `<line x1="${radarCenter}" y1="${radarCenter}" x2="${p1.x}" y2="${p1.y}" stroke="#e2e8f0" stroke-width="0.8"/>`;
    const lp = radarPoint(i, radarRadius + 18);
    radarSvg += `<text x="${lp.x}" y="${lp.y}" text-anchor="middle" dominant-baseline="middle" style="font-size:8px;fill:#475569;font-weight:600;">${radarLabels[i]}</text>`;
  }
  if (radarCount > 2) {
    const dataPts = radarValues.map((v, i) => radarPoint(i, radarRadius * Math.min(1, Math.max(0.05, v))));
    radarSvg += `<polygon points="${dataPts.map(p => `${p.x},${p.y}`).join(' ')}" fill="rgba(99,102,241,0.2)" stroke="#6366f1" stroke-width="1.5"/>`;
    dataPts.forEach(p => {
      radarSvg += `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#6366f1"/>`;
    });
  }
  radarSvg += `</svg>`;

  const tableRows = sectionData.flatMap(sd =>
    sd.secScores.map((item, idx) => {
      const c = item.criterion;
      const s = item.score;
      const weighted = c.max > 0 ? ((s?.superScore || 0) / c.max * 100) : 0;
      const rowBg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
      return `<tr style="background:${rowBg};">
        <td class="td-cell" style="text-align:center;color:#64748b;font-weight:600;width:30px;">${idx + 1}</td>
        <td class="td-cell">
          <div class="criteria-kh">${c.kh}</div>
          <div class="criteria-en">${c.en}</div>
        </td>
        <td class="td-cell" style="text-align:center;font-weight:700;color:#6366f1;">${s?.selfScore ?? '—'}</td>
        ${showSuper ? `<td class="td-cell" style="text-align:center;font-weight:700;color:#7c3aed;">${s?.superScore ?? '—'}</td>` : ''}
        ${showSupporter ? `<td class="td-cell" style="text-align:center;font-weight:700;color:#0891b2;">${s?.supporterScore ?? '—'}</td>` : ''}
        ${showManagement ? `<td class="td-cell" style="text-align:center;font-weight:700;color:#d97706;">${s?.managementScore ?? '—'}</td>` : ''}
        <td class="td-cell" style="text-align:center;font-weight:700;color:#059669;">${weighted.toFixed(1)}%</td>
      </tr>`;
    })
  ).join('');

  const sectionHeaderRows = sectionData.map(sd => {
    const secPct = sd.secMax > 0 ? (sd.totalSuper / sd.secMax * 100) : 0;
    return `<tr class="section-header">
      <td colspan="${colCount}" class="section-header-cell">
        <div class="section-header-inner">
          <div>
            <span class="section-header-title">${sd.sec.khName} / ${sd.sec.name}</span>
            <span class="section-header-weight">Weight: ${sd.sec.weight}%</span>
          </div>
          <div class="section-header-score">${sd.totalSuper.toFixed(1)} / ${sd.secMax} (${secPct.toFixed(1)}%)</div>
        </div>
      </td>
    </tr>`;
  }).join('');

  const colHeaders = `<tr class="table-header-row">
    <th class="th-cell" style="width:30px;text-align:center;">#</th>
    <th class="th-cell" style="text-align:left;">Criteria / មាតិកា</th>
    <th class="th-cell" style="text-align:center;">Self</th>
    ${showSuper ? '<th class="th-cell" style="text-align:center;">Supervisor</th>' : ''}
    ${showSupporter ? '<th class="th-cell" style="text-align:center;">Supporter</th>' : ''}
    ${showManagement ? '<th class="th-cell" style="text-align:center;">Management</th>' : ''}
    <th class="th-cell" style="text-align:center;">Weighted</th>
  </tr>`;

  const fullTableHtml = `<table class="eval-table">
    ${colHeaders}
    ${sectionHeaderRows}
    ${tableRows}
  </table>`;

  const strengths = ev.criteriaScores?.filter(s => (s.superScore || 0) >= 8) || [];
  const developments = ev.criteriaScores?.filter(s => (s.superScore || 0) < 6) || [];

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  ${getStyles()}
</style>
</head>
<body>

<!-- ═══════════════ COVER PAGE ═══════════════ -->
<div class="page cover-page">
  <div class="cover-top-bar"></div>
  <div class="cover-top-gradient"></div>
  <div class="cover-grid"></div>
  <div class="cover-content">
    <div class="cover-icon-wrap">
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
        <path d="M6 12v5c3 3 9 3 12 0v-5"/>
      </svg>
    </div>
    <div class="cover-org-name">Western International School</div>
    <div class="cover-accent-line"></div>
    <h1 class="cover-title">Annual Performance<br/>Management System</h1>
    <h2 class="cover-subtitle">Performance Appraisal Report</h2>
    <div class="cover-hr"></div>

    <div class="cover-employee-card">
      <div class="cover-card-label">Employee</div>
      <div class="cover-card-name">${ev.employeeName}</div>
      <div class="cover-card-role">${ev.position}${ev.department ? ' — ' + ev.department : ''}</div>
      <div class="cover-card-meta">
        <span>ID: ${ev.employeeId}</span>
        <span class="cover-dot">•</span>
        <span>${ev.campus}</span>
      </div>
    </div>

    <div class="cover-footer-text">
      Academic Year: ${ev.evalPeriod || '2026'}<br/>
      Report Generated: ${now}
    </div>
  </div>
  <div class="cover-bottom-bar"></div>
</div>

<!-- ═══════════════ EMPLOYEE INFO + SUMMARY ═══════════════ -->
<div class="page inner-page">
  <div class="page-header">
    <div class="page-header-left">
      <div class="page-header-brand">Western International School</div>
      <div class="page-header-title">Performance Appraisal Report</div>
    </div>
    <div class="page-header-right">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
      </svg>
    </div>
  </div>
  <div class="page-divider"></div>

  <div class="section-title">Employee Information & Evaluation Summary</div>
  <div class="section-accent"></div>

  <div class="info-grid">
    <div class="info-card">
      <div class="info-card-label">Employee Details</div>
      <table class="info-table">
        <tr><td class="info-key">Staff ID</td><td class="info-val">${ev.employeeId}</td></tr>
        <tr><td class="info-key">Name</td><td class="info-val">${ev.employeeName}</td></tr>
        <tr><td class="info-key">Position</td><td class="info-val">${ev.position}</td></tr>
        <tr><td class="info-key">Department</td><td class="info-val">${ev.department || '—'}</td></tr>
        <tr><td class="info-key">Campus</td><td class="info-val">${ev.campus}</td></tr>
        <tr><td class="info-key">Supervisor</td><td class="info-val">${ev.appraiser || '—'}</td></tr>
      </table>
    </div>
    <div class="info-card">
      <div class="info-card-label">Report Details</div>
      <table class="info-table">
        <tr><td class="info-key">Eval Period</td><td class="info-val">${ev.evalPeriod || '2026'}</td></tr>
        <tr><td class="info-key">Eval Model</td><td class="info-val">${getWeightLabel(ev.weightScheme)}</td></tr>
        <tr><td class="info-key">Status</td><td class="info-val">${ev.status || '—'}</td></tr>
        <tr><td class="info-key">Generated On</td><td class="info-val">${now}</td></tr>
        <tr><td class="info-key">Report Ver.</td><td class="info-val">${pageNum > 0 ? pageNum : 1}</td></tr>
      </table>
    </div>
  </div>

  <div class="section-subtitle">Evaluation Summary</div>
  <div class="section-accent-sm"></div>

  <div class="summary-cards">
    <div class="summary-card summary-card-score">
      <div class="summary-card-label">Overall Score</div>
      <div class="summary-card-value">${ev.overallScore.toFixed(1)}</div>
      <div class="summary-card-sub">out of 100</div>
    </div>
    <div class="summary-card" style="background:${rating.bg};border-color:${rating.border};">
      <div class="summary-card-label" style="color:${rating.color};">Rating</div>
      <div class="summary-card-rating" style="color:${rating.color};">${rating.label}</div>
      <div class="summary-card-sub" style="color:${rating.color};opacity:0.8;">${rating.kh}</div>
    </div>
    <div class="summary-card summary-card-pct">
      <div class="summary-card-label">Percentage</div>
      <div class="summary-card-value">${ev.overallScore.toFixed(1)}%</div>
      <div class="summary-card-sub">completion</div>
    </div>
    <div class="summary-card summary-card-status">
      <div class="summary-card-label">Status</div>
      <div class="summary-card-rating">${ev.status || '—'}</div>
      <div class="summary-card-sub">completion status</div>
    </div>
  </div>

  <div class="chart-row">
    <div class="chart-card">
      <div class="chart-title">Performance Gauge</div>
      ${gaugeSvg}
    </div>
    <div class="chart-card">
      <div class="chart-title">Section Breakdown</div>
      ${barChartHtml}
    </div>
  </div>

  <div class="chart-card-full">
    <div class="chart-title">Radar Comparison</div>
    ${radarSvg}
  </div>

  <div class="page-footer">
    <span>Western International School — Annual Performance Management System</span>
    <span>Page {{PAGE_NUM}} | Confidential | ${now}</span>
  </div>
</div>

<!-- ═══════════════ EVALUATION TABLE PAGE ═══════════════ -->
<div class="page inner-page">
  <div class="page-header">
    <div class="page-header-left">
      <div class="page-header-brand">Western International School</div>
      <div class="page-header-title">Performance Appraisal Report</div>
    </div>
    <div class="page-header-right">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
      </svg>
    </div>
  </div>
  <div class="page-divider"></div>

  <div class="section-title">Section-by-Section Evaluation</div>
  <div class="section-accent"></div>

  ${fullTableHtml}

  <div class="weight-summary">
    <div class="weight-summary-item">
      <span class="weight-summary-label">Weighting Scheme:</span>
      <span class="weight-summary-val">${getWeightLabel(ev.weightScheme)}</span>
    </div>
    <div class="weight-summary-item">
      <span class="weight-summary-label">Overall Score:</span>
      <span class="weight-summary-val" style="color:${rating.color};font-weight:800;">${ev.overallScore.toFixed(1)}% (${rating.label})</span>
    </div>
  </div>

  <div class="page-footer">
    <span>Western International School — Annual Performance Management System</span>
    <span>Page {{PAGE_NUM}} | Confidential | ${now}</span>
  </div>
</div>

<!-- ═══════════════ STRENGTHS + DEVELOPMENT ═══════════════ -->
<div class="page inner-page">
  <div class="page-header">
    <div class="page-header-left">
      <div class="page-header-brand">Western International School</div>
      <div class="page-header-title">Performance Appraisal Report</div>
    </div>
    <div class="page-header-right">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
      </svg>
    </div>
  </div>
  <div class="page-divider"></div>

  <div class="section-title">Strengths & Development Areas</div>
  <div class="section-accent"></div>

  <div class="strength-grid">
    <div class="strength-card strength-card-positive">
      <div class="strength-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        <span>Strengths</span>
      </div>
      ${strengths.length > 0 ? `<ul class="strength-list">
        ${strengths.slice(0, 8).map(s => {
          const crit = criteria.find(c => c.id === s.criteriaId);
          return `<li>${crit?.en || 'Criteria #' + s.criteriaId} — Score: ${s.superScore}/10</li>`;
        }).join('')}
      </ul>` : '<div class="strength-empty">No specific strengths recorded.</div>'}
    </div>
    <div class="strength-card strength-card-negative">
      <div class="strength-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12h14"/>
        </svg>
        <span>Areas for Development</span>
      </div>
      ${developments.length > 0 ? `<ul class="strength-list">
        ${developments.slice(0, 8).map(s => {
          const crit = criteria.find(c => c.id === s.criteriaId);
          return `<li>${crit?.en || 'Criteria #' + s.criteriaId} — Score: ${s.superScore}/10</li>`;
        }).join('')}
      </ul>` : '<div class="strength-empty">All areas meet expectations.</div>'}
    </div>
  </div>

  <div class="section-subtitle">Comments & Recommendations</div>
  <div class="section-accent-sm"></div>

  <div class="comments-grid">
    <div class="comment-card">
      <div class="comment-header">
        <div class="comment-avatar comment-avatar-purple">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <div>
          <div class="comment-author">Employee Self Comments</div>
          <div class="comment-lang">មតិយោបល់របស់បុគ្គលិក</div>
        </div>
      </div>
      <div class="comment-body">${ev.evaluatorComments || 'No comments provided.'}</div>
    </div>
    <div class="comment-card">
      <div class="comment-header">
        <div class="comment-avatar comment-avatar-blue">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div>
          <div class="comment-author">Supervisor Comments</div>
          <div class="comment-lang">មតិយោបល់របស់អ្នកគ្រប់គ្រង</div>
        </div>
      </div>
      <div class="comment-body">${ev.evaluatorComments || 'No supervisor comments provided.'}</div>
    </div>
    <div class="comment-card">
      <div class="comment-header">
        <div class="comment-avatar comment-avatar-green">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
        </div>
        <div>
          <div class="comment-author">Supporter Comments</div>
          <div class="comment-lang">មតិយោបល់របស់អ្នកគាំទ្រ</div>
        </div>
      </div>
      <div class="comment-body">No supporter comments provided.</div>
    </div>
    <div class="comment-card">
      <div class="comment-header">
        <div class="comment-avatar comment-avatar-amber">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>
        </div>
        <div>
          <div class="comment-author">Management Comments</div>
          <div class="comment-lang">មតិយោបល់របស់ការិយាល័យ</div>
        </div>
      </div>
      <div class="comment-body">No management comments provided.</div>
    </div>
  </div>

  <div class="final-rec">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
    <div>
      <div class="final-rec-title">Final Recommendation</div>
      <div class="final-rec-text">
        Based on the evaluation results, the employee has achieved an overall score of <strong>${ev.overallScore.toFixed(1)}</strong> (${rating.label} / ${rating.kh}).
        ${ev.overallScore >= 85 ? 'The employee demonstrates excellent performance and is recommended for recognition.' :
          ev.overallScore >= 75 ? 'The employee shows very good performance with areas for continued growth.' :
          ev.overallScore >= 60 ? 'The employee meets expectations with some areas needing improvement.' :
          'The employee requires targeted support and development in key areas.'}
      </div>
    </div>
  </div>

  <div class="page-footer">
    <span>Western International School — Annual Performance Management System</span>
    <span>Page {{PAGE_NUM}} | Confidential | ${now}</span>
  </div>
</div>

<!-- ═══════════════ SIGNATURES PAGE ═══════════════ -->
<div class="page inner-page">
  <div class="page-header">
    <div class="page-header-left">
      <div class="page-header-brand">Western International School</div>
      <div class="page-header-title">Performance Appraisal Report</div>
    </div>
    <div class="page-header-right">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
      </svg>
    </div>
  </div>
  <div class="page-divider"></div>

  <div class="section-title">Approval & Signatures</div>
  <div class="section-accent"></div>

  <div class="signatures-grid">
    ${[
      { label: 'Employee', kh: 'បុគ្គលិក' },
      { label: 'Supervisor', kh: 'អ្នកគ្រប់គ្រង' },
      { label: 'Supporter', kh: 'អ្នកគាំទ្រ' },
      { label: 'Management', kh: 'ការិយាល័យ' },
      { label: 'HR Office', kh: 'ការិយាល័យធនធានមនុស្ស' }
    ].map(s => `
      <div class="sig-card">
        <div class="sig-label-kh">${s.kh}</div>
        <div class="sig-label-en">${s.label}</div>
        <div class="sig-line-wrap">
          <div class="sig-line"></div>
          <div class="sig-line-text">Signature</div>
        </div>
        <div class="sig-line-wrap">
          <div class="sig-line"></div>
          <div class="sig-line-text">Date</div>
        </div>
      </div>
    `).join('')}
  </div>

  <div class="sig-footer-note">
    This document is confidential and intended only for the employee and authorized personnel of Western International School.
  </div>

  <div class="page-footer">
    <span>Western International School — Annual Performance Management System</span>
    <span>Page {{PAGE_NUM}} | Confidential | ${now}</span>
  </div>
</div>

</body></html>`;
}

function getStyles(): string {
  return `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Noto+Sans+Khmer:wght@300;400;500;600;700&display=swap');

  * { margin:0; padding:0; box-sizing:border-box; }

  body {
    font-family: 'Inter', 'Noto Sans Khmer', system-ui, sans-serif;
    background: #f1f5f9;
    color: #1e293b;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  @page {
    size: A4 portrait;
    margin: 0;
  }

  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 12mm 15mm;
    position: relative;
    page-break-after: always;
    background: white;
    overflow: hidden;
  }
  .page:last-child { page-break-after: auto; }

  /* ─── COVER PAGE ─── */
  .cover-page {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%);
    color: white;
    padding: 25mm 20mm;
    position: relative;
    overflow: hidden;
  }
  .cover-top-bar {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 5px;
    background: linear-gradient(90deg, #818cf8, #6366f1, #4f46e5, #7c3aed);
  }
  .cover-bottom-bar {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 5px;
    background: linear-gradient(90deg, #7c3aed, #4f46e5, #6366f1, #818cf8);
  }
  .cover-top-gradient {
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(ellipse at 50% 0%, rgba(129,140,248,0.1) 0%, transparent 70%);
    pointer-events: none;
  }
  .cover-grid {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
  }
  .cover-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .cover-icon-wrap {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: rgba(255,255,255,0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    border: 2px solid rgba(255,255,255,0.25);
  }
  .cover-org-name {
    font-size: 11px;
    letter-spacing: 4px;
    text-transform: uppercase;
    opacity: 0.7;
    margin-bottom: 8px;
    font-weight: 600;
  }
  .cover-accent-line {
    width: 60px;
    height: 2px;
    background: rgba(255,255,255,0.35);
    margin: 10px auto;
    border-radius: 1px;
  }
  .cover-title {
    font-size: 26px;
    font-weight: 900;
    letter-spacing: 1px;
    line-height: 1.2;
    margin-bottom: 6px;
  }
  .cover-subtitle {
    font-size: 15px;
    font-weight: 600;
    opacity: 0.85;
    margin-bottom: 20px;
  }
  .cover-hr {
    width: 40px;
    height: 1px;
    background: rgba(255,255,255,0.25);
    margin: 0 auto 20px;
  }
  .cover-employee-card {
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.18);
    border-radius: 14px;
    padding: 20px 32px;
    max-width: 380px;
    width: 100%;
    backdrop-filter: blur(8px);
  }
  .cover-card-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 2px;
    opacity: 0.5;
    margin-bottom: 8px;
    font-weight: 600;
  }
  .cover-card-name {
    font-size: 22px;
    font-weight: 800;
    margin-bottom: 4px;
  }
  .cover-card-role {
    font-size: 12px;
    opacity: 0.75;
    margin-bottom: 10px;
  }
  .cover-card-meta {
    display: flex;
    gap: 10px;
    justify-content: center;
    font-size: 10px;
    opacity: 0.6;
  }
  .cover-dot { opacity: 0.4; }
  .cover-footer-text {
    margin-top: 28px;
    font-size: 9px;
    opacity: 0.45;
    line-height: 1.6;
  }

  /* ─── PAGE HEADER / FOOTER ─── */
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 6px;
  }
  .page-header-brand {
    font-size: 10px;
    font-weight: 700;
    color: #6366f1;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .page-header-title {
    font-size: 9px;
    color: #94a3b8;
    font-weight: 500;
    margin-top: 2px;
  }
  .page-header-right {
    opacity: 0.4;
  }
  .page-divider {
    height: 2px;
    background: linear-gradient(90deg, #6366f1, #a5b4fc, #e2e8f0);
    border-radius: 1px;
    margin-bottom: 14px;
  }
  .page-footer {
    position: absolute;
    bottom: 8mm;
    left: 15mm;
    right: 15mm;
    display: flex;
    justify-content: space-between;
    font-size: 7.5px;
    color: #94a3b8;
    border-top: 1px solid #e2e8f0;
    padding-top: 5px;
  }

  /* ─── SECTION TITLES ─── */
  .section-title {
    font-size: 15px;
    font-weight: 800;
    color: #1e293b;
    text-align: center;
    margin-bottom: 2px;
  }
  .section-subtitle {
    font-size: 12px;
    font-weight: 700;
    color: #334155;
    text-align: center;
    margin-bottom: 2px;
  }
  .section-accent {
    width: 40px;
    height: 3px;
    background: #6366f1;
    margin: 5px auto 14px;
    border-radius: 2px;
  }
  .section-accent-sm {
    width: 28px;
    height: 2px;
    background: #6366f1;
    margin: 4px auto 12px;
    border-radius: 2px;
  }

  /* ─── INFO CARDS ─── */
  .info-grid {
    display: flex;
    gap: 14px;
    margin-bottom: 18px;
  }
  .info-card {
    flex: 1;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 14px;
  }
  .info-card-label {
    font-size: 8px;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: #94a3b8;
    font-weight: 700;
    margin-bottom: 8px;
  }
  .info-table {
    width: 100%;
    font-size: 10.5px;
    border-collapse: collapse;
  }
  .info-table td {
    padding: 2.5px 0;
  }
  .info-key {
    color: #64748b;
    font-weight: 600;
    width: 100px;
  }
  .info-val {
    color: #1e293b;
    font-weight: 700;
  }

  /* ─── SUMMARY CARDS ─── */
  .summary-cards {
    display: flex;
    gap: 10px;
    margin-bottom: 16px;
  }
  .summary-card {
    flex: 1;
    border-radius: 10px;
    padding: 12px 8px;
    text-align: center;
  }
  .summary-card-score {
    background: linear-gradient(135deg, #ede9fe, #f5f3ff);
    border: 1px solid #c4b5fd;
  }
  .summary-card-pct {
    background: linear-gradient(135deg, #ecfdf5, #f0fdf4);
    border: 1px solid #86efac;
  }
  .summary-card-status {
    background: linear-gradient(135deg, #fef3c7, #fffbeb);
    border: 1px solid #fcd34d;
  }
  .summary-card-label {
    font-size: 8px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #7c3aed;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .summary-card-value {
    font-size: 24px;
    font-weight: 900;
    color: #4f46e5;
    line-height: 1.1;
  }
  .summary-card-rating {
    font-size: 14px;
    font-weight: 800;
    line-height: 1.2;
  }
  .summary-card-sub {
    font-size: 8px;
    color: #64748b;
    margin-top: 2px;
  }

  /* ─── CHARTS ─── */
  .chart-row {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;
  }
  .chart-card {
    flex: 1;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px;
  }
  .chart-card-full {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px;
    text-align: center;
  }
  .chart-title {
    font-size: 9px;
    font-weight: 700;
    color: #475569;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 1px;
    text-align: center;
  }

  /* ─── BAR CHART ─── */
  .bar-row { margin-bottom: 8px; }
  .bar-label {
    display: flex;
    justify-content: space-between;
    margin-bottom: 2px;
    font-size: 10px;
  }
  .bar-label span:first-child {
    font-weight: 600;
    color: #334155;
  }
  .bar-pct {
    font-weight: 700;
  }
  .bar-track {
    background: #e2e8f0;
    border-radius: 4px;
    height: 16px;
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s;
  }
  .bar-sub {
    font-size: 8px;
    color: #94a3b8;
    margin-top: 1px;
  }

  /* ─── EVALUATION TABLE ─── */
  .eval-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    font-size: 10px;
  }
  .table-header-row {
    background: #6366f1;
  }
  .th-cell {
    padding: 8px 8px;
    color: white;
    font-size: 9px;
    font-weight: 700;
    border-right: 1px solid rgba(255,255,255,0.15);
  }
  .th-cell:last-child { border-right: none; }
  .td-cell {
    padding: 6px 8px;
    border-bottom: 1px solid #e2e8f0;
    font-size: 10px;
    color: #475569;
  }
  .criteria-kh {
    font-size: 10px;
    font-weight: 600;
    color: #1e293b;
  }
  .criteria-en {
    font-size: 8.5px;
    color: #64748b;
    margin-top: 1px;
  }
  .section-header {
    background: #f1f5f9;
  }
  .section-header-cell {
    padding: 7px 10px;
    border-bottom: 2px solid #6366f1;
  }
  .section-header-inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .section-header-title {
    font-size: 11px;
    font-weight: 700;
    color: #1e293b;
  }
  .section-header-weight {
    font-size: 9px;
    color: #64748b;
    margin-left: 6px;
  }
  .section-header-score {
    font-size: 11px;
    font-weight: 800;
    color: #6366f1;
  }

  .weight-summary {
    margin-top: 14px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 16px;
  }
  .weight-summary-item {
    display: flex;
    justify-content: space-between;
    font-size: 10.5px;
    padding: 3px 0;
  }
  .weight-summary-label {
    color: #64748b;
    font-weight: 600;
  }
  .weight-summary-val {
    color: #1e293b;
    font-weight: 700;
  }

  /* ─── STRENGTHS ─── */
  .strength-grid {
    display: flex;
    gap: 14px;
    margin-bottom: 18px;
  }
  .strength-card {
    flex: 1;
    border-radius: 10px;
    padding: 14px;
  }
  .strength-card-positive {
    background: #f0fdf4;
    border: 1px solid #86efac;
  }
  .strength-card-negative {
    background: #fef2f2;
    border: 1px solid #fca5a5;
  }
  .strength-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 700;
    margin-bottom: 8px;
  }
  .strength-list {
    list-style: none;
    padding: 0;
  }
  .strength-list li {
    font-size: 9.5px;
    color: #475569;
    padding: 3px 0;
    padding-left: 12px;
    position: relative;
    line-height: 1.4;
  }
  .strength-list li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 10px;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #94a3b8;
  }
  .strength-empty {
    font-size: 9.5px;
    color: #94a3b8;
    font-style: italic;
  }

  /* ─── COMMENTS ─── */
  .comments-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
  }
  .comment-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px;
  }
  .comment-header {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 8px;
  }
  .comment-avatar {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .comment-avatar-purple { background: #ede9fe; }
  .comment-avatar-blue { background: #dbeafe; }
  .comment-avatar-green { background: #d1fae5; }
  .comment-avatar-amber { background: #fef3c7; }
  .comment-author {
    font-size: 10px;
    font-weight: 700;
    color: #1e293b;
  }
  .comment-lang {
    font-size: 8px;
    color: #94a3b8;
  }
  .comment-body {
    font-size: 10px;
    color: #475569;
    line-height: 1.6;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px;
    min-height: 36px;
  }

  /* ─── FINAL RECOMMENDATION ─── */
  .final-rec {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
    border: 1px solid #86efac;
    border-radius: 10px;
    padding: 14px;
    margin-bottom: 18px;
  }
  .final-rec-title {
    font-size: 11px;
    font-weight: 700;
    color: #059669;
    margin-bottom: 4px;
  }
  .final-rec-text {
    font-size: 10px;
    color: #475569;
    line-height: 1.5;
  }

  /* ─── SIGNATURES ─── */
  .signatures-grid {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
  }
  .sig-card {
    flex: 1;
    text-align: center;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 6px;
    background: #f8fafc;
  }
  .sig-label-kh {
    font-size: 8px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  }
  .sig-label-en {
    font-size: 9px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 20px;
  }
  .sig-line-wrap {
    margin-bottom: 6px;
  }
  .sig-line {
    border-top: 1px solid #94a3b8;
    width: 80%;
    margin: 0 auto;
  }
  .sig-line-text {
    font-size: 7px;
    color: #94a3b8;
    margin-top: 2px;
  }
  .sig-footer-note {
    font-size: 8px;
    color: #94a3b8;
    text-align: center;
    font-style: italic;
  }
  `;
}

export async function generatePdfReport(data: PdfReportData): Promise<void> {
  const html2pdf = (await import('html2pdf.js')).default;

  const totalPages = 5;
  let fullHtml = '';
  for (let i = 1; i <= totalPages; i++) {
    const pageHtml = buildHtml(data, i);
    fullHtml += pageHtml;
  }

  fullHtml = fullHtml.replace(/\{\{PAGE_NUM\}\}/g, (match, offset) => {
    const pageIndex = fullHtml.substring(0, offset).split('<div class="page').length - 1;
    return String(pageIndex);
  });

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:210mm;background:white;z-index:-1;';
  container.innerHTML = fullHtml;
  document.body.appendChild(container);

  await new Promise(r => setTimeout(r, 800));

  const filename = `Performance_Report_${data.evaluation.employeeName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;

  await (html2pdf() as any)
    .set({
      margin: 0,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 210 * 3.78,
        height: 297 * 3.78,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    })
    .from(container)
    .save();

  document.body.removeChild(container);
}

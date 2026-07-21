import { apiFetch } from '../mockApi';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CriteriaScore, PeerFeedback, STATUS_LABELS } from '../types';
import { Save, Plus, Trash2, Printer, Lock, Unlock, CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSettings, useSelfEvalSettings, usePositionFormConfigs } from '../hooks/useSettings';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import {
  canEditSelfEval, canEditSupervisorSection, canEditSupporterSection,
  canEditManagementSection, canEditAspSection, getNextStatus,
  getVisibleColumns, calculateOverallScore, computeSectionWeightedScore,
  getWorkflowStage, isStageLocked,
  canRejectEvaluation, canReopenEvaluation, isSuperAdmin, SectionInfo
} from '../utils/rbac';
import { sendStatusChangeNotification } from '../utils/notifications';
import { generatePdfReport } from '../utils/pdfReport';
import toast from 'react-hot-toast';

export default function EvaluationForm() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const isViewOnly = searchParams.get('view') === 'true';

  const { config, loading: configLoading } = useSettings();
  const { profiles, loading: profilesLoading } = useSelfEvalSettings();
  const { configs: positionConfigs, loading: posConfigsLoading } = usePositionFormConfigs();
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(!!editId);
  const [formData, setFormData] = useState({
    id: '',
    employeeId: '',
    employeeName: '',
    campus: '',
    department: '',
    position: '',
    category: '',
    appraiser: '',
    supporter: '',
    evalPeriod: '',
    reviewDate: new Date().toISOString().split('T')[0],
    weightScheme: '',
    evaluationType: 'management',
    status: 'Draft',
    createdAt: '',
    createdByName: '',
    evaluatorComments: ''
  });

  const [criteriaScores, setCriteriaScores] = useState<CriteriaScore[]>([]);
  const [peerFeedbacks, setPeerFeedbacks] = useState<PeerFeedback[]>([]);
  const scoresLoadedFromServer = useRef(false);

  useEffect(() => { if (editId) fetchEvaluation(); }, [editId]);

  const fetchEvaluation = async () => {
    try {
      const res = await apiFetch(`/api/evaluations/${editId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFormData({
          id: data.id, employeeId: data.employeeId, employeeName: data.employeeName,
          campus: data.campus, department: data.department || '', position: data.position,
          category: data.category || '', appraiser: data.appraiser, supporter: data.supporter || '',
          evalPeriod: data.evalPeriod || '', reviewDate: data.reviewDate, weightScheme: data.weightScheme,
          evaluationType: data.evaluationType || 'management', status: data.status || 'Draft',
          createdAt: data.createdAt, createdByName: data.createdByName, evaluatorComments: data.evaluatorComments || ''
        });
        const loadedScores = (data.criteriaScores || data.scores || []).map((s: any) => ({
          criteriaId: s.criteriaId, selfScore: s.selfScore ?? 0, superScore: s.superScore ?? 0,
          supporterScore: s.supporterScore ?? 0, managementScore: s.managementScore ?? 0, aspScore: s.aspScore ?? 0,
        }));
        setCriteriaScores(loadedScores);
        scoresLoadedFromServer.current = loadedScores.length > 0;
        setPeerFeedbacks(data.peerFeedbacks || []);
      } else {
        alert('Evaluation not found');
        navigate('/dashboard');
      }
    } catch (err) { console.error(err); }
    finally { setInitialLoad(false); }
  };

  useEffect(() => {
    if (!editId && formData.evaluationType === '') {
      setFormData(prev => ({
        ...prev,
        evaluationType: 'management',
      }));
    }
  }, [editId]);

  const matchedProfile = useMemo(() => {
    if (!profiles) return null;
    return profiles.find(p => {
      if (p.department && p.department.toLowerCase() !== formData.department.toLowerCase()) return false;
      if (p.campus && p.campus.toLowerCase() !== formData.campus.toLowerCase()) return false;
      if (p.position && p.position.toLowerCase() !== formData.position.toLowerCase()) return false;
      if (p.category && p.category.toLowerCase() !== formData.category.toLowerCase()) return false;
      if (p.evaluationPeriod && p.evaluationPeriod.toLowerCase() !== formData.evalPeriod.toLowerCase()) return false;
      return true;
    }) || null;
  }, [profiles, formData.department, formData.campus, formData.position, formData.category, formData.evalPeriod]);

  // Check if there's a position-based form config for this evaluation's position
  const positionFormConfig = useMemo(() => {
    if (!positionConfigs || !formData.position) return null;
    return positionConfigs.find(c => c.position === formData.position) || null;
  }, [positionConfigs, formData.position]);

  const currentCriteria = useMemo(() => {
    // Priority 1: Position-based form config (primary source)
    if (positionFormConfig && positionFormConfig.criteria.length > 0) {
      return positionFormConfig.criteria
        .filter(c => c.status === 'active')
        .map(c => ({
          id: c.id,
          kh: c.kh,
          khDesc: c.khDesc,
          en: c.en,
          desc: c.desc,
          max: c.max,
          sectionId: c.sectionId
        }));
    }
    // Priority 2: Matched self-eval profile
    if (matchedProfile?.criteria && matchedProfile.criteria.length > 0) {
      return matchedProfile.criteria;
    }
    return [];
  }, [positionFormConfig, matchedProfile]);

  const allSections = useMemo(() => {
    if (!positionFormConfig) return [];
    return positionFormConfig.sections
      .filter(s => s.status === 'active')
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(s => ({ id: s.id, name: s.name, khName: s.khName, displayOrder: s.displayOrder }));
  }, [positionFormConfig]);

  useEffect(() => {
    if (editId && scoresLoadedFromServer.current) {
      // Scores were already loaded from server for an existing evaluation.
      // Only remap if criteria count changed (e.g., config updated), preserving existing scores.
      if (currentCriteria.length > 0 && criteriaScores.length > 0 && currentCriteria.length !== criteriaScores.length) {
        const scoreMap = new Map(criteriaScores.map(s => [s.criteriaId, s]));
        setCriteriaScores(currentCriteria.map(c => {
          const existing = scoreMap.get(c.id);
          return existing || {
            criteriaId: c.id, selfScore: 0, superScore: 0, supporterScore: 0, managementScore: 0, aspScore: 0
          };
        }));
      }
      return;
    }
    // New evaluation or scores not yet loaded from server: initialize scores from criteria
    if (currentCriteria.length > 0 && criteriaScores.length === 0) {
      setCriteriaScores(currentCriteria.map(c => ({
        criteriaId: c.id, selfScore: 0, superScore: 0, supporterScore: 0, managementScore: 0, aspScore: 0
      })));
    } else if (editId && currentCriteria.length > 0 && criteriaScores.length > 0 && currentCriteria.length !== criteriaScores.length) {
      const scoreMap = new Map(criteriaScores.map(s => [s.criteriaId, s]));
      setCriteriaScores(currentCriteria.map(c => {
        const existing = scoreMap.get(c.id);
        return existing || {
          criteriaId: c.id, selfScore: 0, superScore: 0, supporterScore: 0, managementScore: 0, aspScore: 0
        };
      }));
    }
  }, [currentCriteria, editId, initialLoad]);

  const handleCriteriaChange = useCallback((idx: number, field: keyof CriteriaScore, val: string, maxScore: number = 10) => {
    const num = Math.min(maxScore, Math.max(0, parseFloat(val) || 0));
    setCriteriaScores(prev => prev.map((s, i) => i === idx ? { ...s, [field]: num } : s));
  }, []);

  const addPeerFeedback = () => setPeerFeedbacks([...peerFeedbacks, { peerName: '', feedback: '', score: 0 }]);
  const updatePeerFeedback = (idx: number, field: keyof PeerFeedback, val: string | number) => {
    const newFb = [...peerFeedbacks];
    newFb[idx] = { ...newFb[idx], [field]: val };
    setPeerFeedbacks(newFb);
  };
  const removePeerFeedback = (idx: number) => setPeerFeedbacks(peerFeedbacks.filter((_, i) => i !== idx));

  // ─── Column Visibility ───
  const cols = getVisibleColumns(formData.weightScheme);

  // ─── Score Totals ───
  const totalSelf = criteriaScores.reduce((sum, c) => sum + (c.selfScore || 0), 0);
  const totalSuper = criteriaScores.reduce((sum, c) => sum + (c.superScore || 0), 0);
  const totalSupporter = criteriaScores.reduce((sum, c) => sum + (c.supporterScore || 0), 0);
  const totalManagement = criteriaScores.reduce((sum, c) => sum + (c.managementScore || 0), 0);
  const totalAsp = criteriaScores.reduce((sum, c) => sum + (c.aspScore || 0), 0);
  const maxPossibleScore = currentCriteria.reduce((sum, c) => sum + (c.max || 10), 0);

  // ─── Peer Feedback Bonus ───
  const peerAvgBonus = peerFeedbacks.length > 0
    ? (peerFeedbacks.reduce((sum, p) => sum + p.score, 0) / peerFeedbacks.length) * 0.5
    : 0;

  // ─── Section Info for Weighted Calculation ───
  const activeSections = useMemo(() => {
    if (!positionFormConfig) return [];
    return positionFormConfig.sections
      .filter(s => s.status === 'active')
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [positionFormConfig]);

  const sectionInfo: SectionInfo | undefined = useMemo(() => {
    if (activeSections.length === 0 || currentCriteria.length === 0) return undefined;
    return {
      sections: activeSections,
      criteria: currentCriteria.map(c => ({ id: c.id, sectionId: (c as any).sectionId, max: c.max || 10 })),
      criteriaScores,
    };
  }, [activeSections, currentCriteria, criteriaScores]);

  // ─── Overall Score Calculation ───
  const overallScore = calculateOverallScore(
    formData.weightScheme,
    { self: totalSelf, super: totalSuper, supporter: totalSupporter, management: totalManagement, asp: totalAsp },
    maxPossibleScore,
    peerAvgBonus,
    sectionInfo
  );

  // ─── Section Weighted Total Scores ───
  const weightedSelf = useMemo(
    () => sectionInfo ? computeSectionWeightedScore('selfScore', sectionInfo) : 0,
    [sectionInfo]
  );
  const weightedSuper = useMemo(
    () => sectionInfo ? computeSectionWeightedScore('superScore', sectionInfo) : 0,
    [sectionInfo]
  );
  const weightedSupporter = useMemo(
    () => sectionInfo ? computeSectionWeightedScore('supporterScore', sectionInfo) : 0,
    [sectionInfo]
  );

  const fetchEmployeeData = async (empId: string) => {
    if (!empId) return;
    try {
      const res = await apiFetch(`/api/employees?id=${empId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const emp = await res.json();
        if (emp) {
          setFormData(prev => ({
            ...prev,
            employeeName: emp.name + (emp.khmerName ? ` (${emp.khmerName})` : ''),
            campus: emp.campus || prev.campus, department: emp.department || prev.department,
            position: emp.position || prev.position, category: emp.category || prev.category,
            appraiser: emp.supervisorId || prev.appraiser, supporter: emp.supporterId || prev.supporter,
            weightScheme: emp.evalModel || prev.weightScheme, evalPeriod: emp.evalPeriod || prev.evalPeriod
          }));
        }
      }
    } catch (err) { console.error("Failed to fetch employee", err); }
  };

  // ─── RBAC Permissions ───
  const canEditSelf = canEditSelfEval(user, { employeeId: formData.employeeId, status: formData.status }, isViewOnly);
  const canEditSuper = canEditSupervisorSection(user, { appraiser: formData.appraiser, status: formData.status }, isViewOnly);
  const canEditSupporter = canEditSupporterSection(user, { supporter: formData.supporter, status: formData.status }, isViewOnly);
  const canEditMgmt = canEditManagementSection(user, isViewOnly);
  const canEditAsp = canEditAspSection(user, isViewOnly);
  const canReject = canRejectEvaluation(user, { appraiser: formData.appraiser, supporter: formData.supporter, status: formData.status });
  const canReopen = canReopenEvaluation(user, { status: formData.status });
  const superadminEdit = isSuperAdmin(user) && !isViewOnly;

  // ─── Status & Workflow ───
  const nextStatus = (action: 'save' | 'submit' | 'reject' | 'reopen') => getNextStatus(formData.status, action, cols.supporter);
  const isCompleted = formData.status === 'Completed' || formData.status === 'Approved';
  const workflowStage = getWorkflowStage(formData.status);

  // ─── Submit Handler ───
  const handleActionSubmit = async (e: React.FormEvent, action: 'save' | 'submit' | 'reject' | 'reopen') => {
    e.preventDefault();
    if (isViewOnly) return;
    setLoading(true);
    try {
      const targetStatus = nextStatus(action);
      const res = await apiFetch(editId ? `/api/evaluations/${editId}` : '/api/evaluations', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...formData, status: targetStatus, criteriaScores, peerFeedbacks,
          totalSelf, totalSuper, overallScore
        })
      });
      if (!res.ok) throw new Error('Failed to submit evaluation');

      // Send notification for status change
      if (editId && token) {
        await sendStatusChangeNotification(token, targetStatus, editId, {
          employeeId: formData.employeeId,
          employeeName: formData.employeeName,
          appraiser: formData.appraiser,
          supporter: formData.supporter,
          position: formData.position,
        }, user?.name || '');
      }

      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      alert('Error saving evaluation');
    } finally { setLoading(false); }
  };

  const handleSubmit = (e: React.FormEvent) => handleActionSubmit(e, 'submit');
  const handleReject = (e: React.FormEvent) => {
    if (confirm('Are you sure you want to return this evaluation to the employee for revision?')) {
      handleActionSubmit(e, 'reject');
    }
  };

  if (profilesLoading || posConfigsLoading || initialLoad) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-400">{initialLoad ? 'Loading evaluation data...' : 'Loading form configuration...'}</span>
        </div>
      </div>
    );
  }

  // ─── Workflow Stage Steps ───
  const workflowSteps = [
    { key: 'self', label: 'Self-Eval', khLabel: 'ខ្លួនឯង' },
    { key: 'supervisor', label: 'Supervisor', khLabel: 'អ្នកគ្រប់គ្រង' },
    ...(cols.supporter ? [{ key: 'supporter', label: 'Supporter', khLabel: 'អ្នកគាំទ្រ' }] : []),
    { key: 'final', label: 'Final', khLabel: 'បញ្ចប់' },
  ];

  const currentStepIdx = workflowSteps.findIndex(s => {
    if (s.key === 'self') return workflowStage === 'Self-Evaluation' || workflowStage === 'Returned for Revision';
    if (s.key === 'supervisor') return workflowStage === 'Supervisor Review';
    if (s.key === 'supporter') return workflowStage === 'Supporter Review';
    if (s.key === 'final') return workflowStage === 'Completed' || workflowStage === 'Approved';
    return false;
  });

  return (
    <form noValidate onSubmit={handleSubmit} className="max-w-6xl mx-auto space-y-6 sm:space-y-8 print:space-y-4 print:max-w-none">

      {/* Print Header */}
      <div className="hidden print:flex flex-col items-center justify-center mb-8 border-b border-slate-200 pb-6">
        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">របាយការណ៍វាយតម្លៃបុគ្គលិក</h1>
        <h2 className="text-lg font-bold text-slate-700 mb-2">Employee Performance Appraisal</h2>
        <div className="text-xs text-slate-500 font-medium">Performance Appraisal System • {format(new Date(), 'dd MMM yyyy')}</div>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
            {isViewOnly ? 'របាយការណ៍វាយតម្លៃ' : editId ? 'កែប្រែការវាយតម្លៃ' : 'ការវាយតម្លៃបុគ្គលិកថ្មី'}
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            {isViewOnly ? 'View Evaluation Report' : editId ? 'Edit Performance Evaluation' : 'Create a New Performance Evaluation'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isViewOnly && (
            <button type="button" onClick={async () => {
              try {
                const cfgRes = await apiFetch('/api/settings/position_form_configs', { headers: { Authorization: `Bearer ${token}` } });
                const cfgs = await cfgRes.json();
                const cfg = Array.isArray(cfgs) ? cfgs.find((c: any) => c.position === formData.position) : null;
                await generatePdfReport({ evaluation: formData as any, positionFormConfig: cfg });
                toast.success('PDF exported');
              } catch { toast.error('Failed to generate PDF'); }
            }}
              className="flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 glass-card rounded-2xl text-slate-700 dark:text-slate-300 font-bold text-sm transition-all active:scale-95 hover:bg-white/80 dark:hover:bg-white/10">
              <Printer size={18} /> Export PDF
            </button>
          )}
          {!isViewOnly && (!isCompleted || superadminEdit) && (
            <>
              <button type="button" onClick={(e) => handleActionSubmit(e, 'save')} disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 glass-card rounded-2xl text-slate-700 dark:text-slate-300 font-bold text-sm transition-all active:scale-95 disabled:opacity-50">
                Save as Draft
              </button>
              {canReject && (
                <button type="button" onClick={handleReject} disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold text-sm rounded-2xl shadow-lg shadow-rose-500/25 transition-all active:scale-95 disabled:opacity-50">
                  {isCompleted ? 'Reopen & Return' : 'Return to Employee'}
                </button>
              )}
              {canReopen && (
                <button type="button" onClick={(e) => { if (confirm('Reopen this evaluation? This will reset its status to Draft.')) handleActionSubmit(e, 'reopen'); }} disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-sm rounded-2xl shadow-lg shadow-amber-500/25 transition-all active:scale-95 disabled:opacity-50">
                  Reopen as Draft
                </button>
              )}
              <button type="submit" disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-500/25 transition-all active:scale-95 disabled:opacity-50">
                <Save size={18} />
                {loading ? 'Saving...' : 'Submit'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ─── Workflow Progress ─── */}
      {editId && (
        <div className="glass-card-strong rounded-3xl p-4 sm:p-6 print:hidden">
          <div className="flex items-center justify-between overflow-x-auto gap-2">
            {workflowSteps.map((step, i) => {
              const isDone = i < currentStepIdx || isCompleted;
              const isCurrent = i === currentStepIdx;
              return (
                <React.Fragment key={step.key}>
                  <div className={cn("flex items-center gap-2 shrink-0", isDone && "text-emerald-600 dark:text-emerald-400", isCurrent && "text-indigo-600 dark:text-indigo-400", !isDone && !isCurrent && "text-slate-400 dark:text-slate-600")}>
                    {isDone ? <CheckCircle2 size={18} className="text-emerald-500" /> : isCurrent ? <Unlock size={18} /> : <Circle size={18} />}
                    <span className="text-xs sm:text-sm font-bold whitespace-nowrap">{step.label}</span>
                  </div>
                  {i < workflowSteps.length - 1 && (
                    <div className={cn("h-0.5 w-6 sm:w-10 rounded-full shrink-0", i < currentStepIdx ? "bg-emerald-400" : i === currentStepIdx ? "bg-indigo-400" : "bg-slate-200 dark:bg-slate-700")} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Lock size={12} /> {formData.status}
            </span>
            <span>•</span>
            <span>Current stage: {workflowStage}</span>
          </div>
        </div>
      )}

      {/* ─── Employee Information ─── */}
      <div className="glass-card-strong rounded-3xl overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-white/20 dark:border-white/[0.06]">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white mb-5 sm:mb-6">
            ព័ត៌មានបុគ្គលិក<br />
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Employee Information</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Input disabled={isViewOnly} label={<>Employee ID / លេខសម្គាល់</>} value={formData.employeeId} onChange={v => setFormData({...formData, employeeId: v})} onBlur={() => fetchEmployeeData(formData.employeeId)} required />
            <Input disabled={isViewOnly} label={<>Employee Name / ឈ្មោះ</>} value={formData.employeeName} onChange={v => setFormData({...formData, employeeName: v})} required />
            <Input disabled={isViewOnly} label={<>Campus / សាខា</>} value={formData.campus} onChange={v => setFormData({...formData, campus: v})} required />
            <Input disabled={isViewOnly} label={<>Department / ផ្នែក</>} value={formData.department} onChange={v => setFormData({...formData, department: v})} required />
            <Input disabled={isViewOnly} label={<>Position / តួនាទី</>} value={formData.position} onChange={v => setFormData({...formData, position: v})} required />
            <Input disabled={isViewOnly} label={<>Category / ប្រភេទ</>} value={formData.category} onChange={v => setFormData({...formData, category: v})} />
            <Input disabled={isViewOnly} label={<>Supervisor / អ្នកវាយតម្លៃ</>} value={formData.appraiser} onChange={v => setFormData({...formData, appraiser: v})} required />
            <Input disabled={isViewOnly} label={<>Supporter / អ្នកគាំទ្រ</>} value={formData.supporter} onChange={v => setFormData({...formData, supporter: v})} />
            <Input disabled={isViewOnly} label={<>Eval Period / វដ្ត</>} value={formData.evalPeriod} onChange={v => setFormData({...formData, evalPeriod: v})} />
            <Input disabled={isViewOnly} label={<>Review Date / កាលបរិច្ឆេទ</>} type="date" value={formData.reviewDate} onChange={v => setFormData({...formData, reviewDate: v})} required />

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Weighting Scheme / របៀបគណនា</label>
              <div className="w-full px-4 py-3 rounded-2xl border border-slate-200/60 dark:border-white/[0.1] bg-slate-50/80 dark:bg-white/[0.04] font-medium text-sm text-slate-500 dark:text-slate-400">
                {config?.weightingSchemes?.find(s => s.id === formData.weightScheme)?.label || formData.weightScheme || '—'}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Criteria Scoring Table ─── */}
        <div className="p-4 sm:p-8">
          {(() => {
            const sections = allSections;
            const shownIds = new Set<number>();
            const allBlocks: React.ReactNode[] = [];

            const renderTable = (crits: typeof currentCriteria, blockKey: string) => (
              <div key={blockKey} className="overflow-x-auto rounded-2xl border border-white/30 dark:border-white/[0.08] mb-6 sm:mb-8">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-white/[0.03] border-b border-slate-200/60 dark:border-white/[0.06]">
                      <th className="px-4 sm:px-6 py-3 sm:py-4 w-10 text-center text-xs font-bold text-slate-500 uppercase">#</th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 min-w-[200px] text-xs font-bold text-slate-500 uppercase">Criteria / លក្ខណៈ</th>
                      {cols.self && <th className="px-3 sm:px-6 py-3 sm:py-4 text-center w-28 sm:w-36 text-xs font-bold text-slate-500 uppercase">Self<br/><span className="font-normal normal-case">ខ្លួនឯង</span></th>}
                      {cols.super && <th className="px-3 sm:px-6 py-3 sm:py-4 text-center w-28 sm:w-36 text-xs font-bold text-indigo-500 uppercase">Supervisor<br/><span className="font-normal normal-case">អ្នកគ្រប់គ្រង</span></th>}
                      {cols.supporter && <th className="px-3 sm:px-6 py-3 sm:py-4 text-center w-28 sm:w-36 text-xs font-bold text-teal-500 uppercase">Supporter<br/><span className="font-normal normal-case">អ្នកគាំទ្រ</span></th>}
                      {cols.management && <th className="px-3 sm:px-6 py-3 sm:py-4 text-center w-28 sm:w-36 text-xs font-bold text-amber-500 uppercase">Management<br/><span className="font-normal normal-case">ថ្នាក់គ្រប់គ្រង</span></th>}
                      {cols.asp && <th className="px-3 sm:px-6 py-3 sm:py-4 text-center w-28 sm:w-36 text-xs font-bold text-rose-500 uppercase">ASP<br/><span className="font-normal normal-case">គណៈអភិបាល</span></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60 dark:divide-white/[0.04]">
                    {crits.map(crit => {
                      const i = currentCriteria.indexOf(crit);
                      return (
                        <tr key={crit.id} className="hover:bg-slate-50/30 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 sm:px-6 py-3 sm:py-4 font-bold text-slate-400 text-center text-xs">{i + 1}</td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4">
                            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">{crit.kh}</div>
                            <div className="text-slate-500 dark:text-slate-400 font-medium text-xs mt-0.5">{crit.en}</div>
                          </td>
                          {cols.self && (
                            <td className="px-3 sm:px-6 py-3">
                              <ScoreInput value={criteriaScores[i]?.selfScore ?? 0} max={crit.max || 10} disabled={!canEditSelf}
                                color="slate" onChange={v => handleCriteriaChange(i, 'selfScore', v, crit.max)} />
                            </td>
                          )}
                          {cols.super && (
                            <td className="px-3 sm:px-6 py-3">
                              <ScoreInput value={criteriaScores[i]?.superScore ?? 0} max={crit.max || 10} disabled={!canEditSuper}
                                color="indigo" onChange={v => handleCriteriaChange(i, 'superScore', v, crit.max)} />
                            </td>
                          )}
                          {cols.supporter && (
                            <td className="px-3 sm:px-6 py-3">
                              <ScoreInput value={criteriaScores[i]?.supporterScore ?? 0} max={crit.max || 10} disabled={!canEditSupporter}
                                color="teal" onChange={v => handleCriteriaChange(i, 'supporterScore', v, crit.max)} />
                            </td>
                          )}
                          {cols.management && (
                            <td className="px-3 sm:px-6 py-3">
                              <ScoreInput value={criteriaScores[i]?.managementScore ?? 0} max={crit.max || 10} disabled={!canEditMgmt}
                                color="amber" onChange={v => handleCriteriaChange(i, 'managementScore', v, crit.max)} />
                            </td>
                          )}
                          {cols.asp && (
                            <td className="px-3 sm:px-6 py-3">
                              <ScoreInput value={criteriaScores[i]?.aspScore ?? 0} max={crit.max || 10} disabled={!canEditAsp}
                                color="rose" onChange={v => handleCriteriaChange(i, 'aspScore', v, crit.max)} />
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );

            sections.forEach(section => {
              const sectionCriteria = currentCriteria.filter(c => c.sectionId === section.id);
              if (sectionCriteria.length === 0) return;
              sectionCriteria.forEach(c => shownIds.add(c.id));
              allBlocks.push(
                <div key={`heading-${section.id}`} className="mb-2 mt-5 sm:mt-6 first:mt-0">
                  <h3 className="text-base sm:text-lg font-extrabold text-indigo-700 dark:text-indigo-300 tracking-wide">{section.khName || section.name}</h3>
                  {section.khName && section.name && <div className="text-xs sm:text-sm font-bold text-indigo-500 dark:text-indigo-400">{section.name}</div>}
                </div>
              );
              allBlocks.push(renderTable(sectionCriteria, `table-${section.id}`));
            });

            const uncategorized = currentCriteria.filter(c => !shownIds.has(c.id));
            if (uncategorized.length > 0) {
              allBlocks.push(<div key="heading-unc" className="mb-2 mt-5 sm:mt-6 first:mt-0"><h3 className="text-base sm:text-lg font-extrabold text-slate-500 uppercase tracking-wide">Other Criteria</h3></div>);
              allBlocks.push(renderTable(uncategorized, 'table-uncategorized'));
            }

            return allBlocks;
          })()}

          {/* ─── Totals Footer ─── */}
          <div className="overflow-x-auto rounded-2xl border border-white/30 dark:border-white/[0.08]">
            <table className="w-full text-left text-sm">
              <tfoot>
                <tr className="bg-slate-50/80 dark:bg-white/[0.03]">
                  <td colSpan={2} className="px-4 sm:px-6 py-4 font-extrabold text-slate-800 dark:text-slate-100 text-right text-xs uppercase tracking-widest">Total / សរុប (Max {maxPossibleScore})</td>
                  {cols.self && <td className="px-3 sm:px-6 py-4 text-center font-extrabold text-lg text-slate-700 dark:text-slate-300">{totalSelf.toFixed(1)}</td>}
                  {cols.super && <td className="px-3 sm:px-6 py-4 text-center font-extrabold text-lg text-indigo-600 dark:text-indigo-400">{totalSuper.toFixed(1)}</td>}
                  {cols.supporter && <td className="px-3 sm:px-6 py-4 text-center font-extrabold text-lg text-teal-600 dark:text-teal-400">{totalSupporter.toFixed(1)}</td>}
                  {cols.management && <td className="px-3 sm:px-6 py-4 text-center font-extrabold text-lg text-amber-600 dark:text-amber-400">{totalManagement.toFixed(1)}</td>}
                  {cols.asp && <td className="px-3 sm:px-6 py-4 text-center font-extrabold text-lg text-rose-600 dark:text-rose-400">{totalAsp.toFixed(1)}</td>}
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ─── Total Score Calculations ─── */}
          {sectionInfo && (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white/30 dark:border-white/[0.08]">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-white/[0.03] border-b border-slate-200/60 dark:border-white/[0.06]">
                    <th className="px-4 sm:px-6 py-3 text-xs font-bold text-slate-500 uppercase" colSpan={2}>Total Score Calculations / ការគណនាពិន្ទុសរុប</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60 dark:divide-white/[0.04]">
                  <tr className="hover:bg-slate-50/30 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 sm:px-6 py-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">Self Score (Total)</div>
                      <div className="text-slate-500 dark:text-slate-400 font-medium text-xs">ពិន្ទុដោយខ្លួនឯង</div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-center">
                      <span className="font-extrabold text-slate-700 dark:text-slate-300 text-lg">{weightedSelf.toFixed(1)}%</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/30 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 sm:px-6 py-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">Supervisor Score (Total)</div>
                      <div className="text-slate-500 dark:text-slate-400 font-medium text-xs">ពិន្ទុអ្នកគ្រប់គ្រង</div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-center">
                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-lg">{weightedSuper.toFixed(1)}%</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/30 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 sm:px-6 py-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">Supporter Score (Total)</div>
                      <div className="text-slate-500 dark:text-slate-400 font-medium text-xs">ពិន្ទុអ្នកគាំទ្រ</div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-center">
                      <span className="font-extrabold text-teal-600 dark:text-teal-400 text-lg">{weightedSupporter.toFixed(1)}%</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* ─── RBAC Info Banner ─── */}
          {editId && !isViewOnly && (!isCompleted || superadminEdit) && (
            <div className={cn(
              "mt-4 p-4 rounded-2xl border",
              superadminEdit && isCompleted
                ? "bg-indigo-50/80 dark:bg-indigo-500/5 border-indigo-200/50 dark:border-indigo-500/15"
                : formData.status === 'Returned to Employee'
                  ? "bg-rose-50/80 dark:bg-rose-500/5 border-rose-200/50 dark:border-rose-500/15"
                  : "bg-amber-50/80 dark:bg-amber-500/5 border-amber-200/50 dark:border-amber-500/15"
            )}>
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className={cn("shrink-0 mt-0.5",
                  superadminEdit && isCompleted ? "text-indigo-500"
                    : formData.status === 'Returned to Employee' ? "text-rose-500" : "text-amber-500"
                )} />
                <div className={cn("text-xs sm:text-sm font-medium",
                  superadminEdit && isCompleted ? "text-indigo-700 dark:text-indigo-300"
                    : formData.status === 'Returned to Employee' ? "text-rose-700 dark:text-rose-300" : "text-amber-700 dark:text-amber-300"
                )}>
                  {superadminEdit && isCompleted ? (
                    <>
                      <span className="font-bold">Super Admin Override:</span> You have full administrative access.
                      You can edit all sections, override scores, or reopen this evaluation.
                    </>
                  ) : formData.status === 'Returned to Employee' ? (
                    <>
                      <span className="font-bold">Returned for Revision:</span> This evaluation has been sent back to you.
                      Please review the feedback, make necessary changes, and resubmit.
                    </>
                  ) : (
                    <>
                      <span className="font-bold">Access Control:</span> You can only edit your assigned section.
                      Self-evaluation scores are locked and read-only for all non-employee users.
                    </>
                  )}
                  {' '}Status: <span className="font-bold">{formData.status}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── 360 Peer Feedback ─── */}
        <div className="p-4 sm:p-8 border-t border-white/20 dark:border-white/[0.06]">
          <div className="flex items-center justify-between mb-5 sm:mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">Peer Feedback (360°)</h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">មតិយោបល់មិត្តរួមការងារ • Optional</p>
            </div>
            {!isViewOnly && (
              <button type="button" onClick={addPeerFeedback}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 glass-card rounded-2xl text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm transition-all active:scale-95 hover:bg-white/80 dark:hover:bg-white/10">
                <Plus size={16} /> Add
              </button>
            )}
          </div>
          {peerFeedbacks.length === 0 ? (
            <div className="text-center py-8 text-slate-400 font-medium border-2 border-dashed border-slate-200 dark:border-white/[0.08] rounded-2xl bg-white/40 dark:bg-white/[0.02] text-sm">
              No peer feedback added yet.
            </div>
          ) : (
            <div className="space-y-4">
              {peerFeedbacks.map((fb, i) => (
                <div key={i} className="flex gap-3 sm:gap-4 items-start p-4 sm:p-6 glass-card rounded-2xl relative group hover:border-indigo-200 dark:hover:border-indigo-500/20 transition-all">
                  <div className="flex-1 space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <Input disabled={isViewOnly} label={<>Peer Name / ឈ្មោះ</>} value={fb.peerName} onChange={v => updatePeerFeedback(i, 'peerName', v)} required />
                      <Input disabled={isViewOnly} label={<>Rating (1-10) / ពិន្ទុ</>} type="number" value={fb.score.toString()} onChange={v => updatePeerFeedback(i, 'score', parseFloat(v))} required />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Feedback / សង្ខេប</label>
                      <textarea disabled={isViewOnly}
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200/60 dark:border-white/[0.1] bg-white/60 dark:bg-white/[0.04] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none font-medium text-sm disabled:opacity-60"
                        rows={2} value={fb.feedback} onChange={e => updatePeerFeedback(i, 'feedback', e.target.value)} required />
                    </div>
                  </div>
                  {!isViewOnly && (
                    <button type="button" onClick={() => removePeerFeedback(i)}
                      className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Evaluator Comments ─── */}
      <div className="glass-card-strong rounded-3xl overflow-hidden p-4 sm:p-8">
        <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white mb-4 sm:mb-6">
          Evaluator Comments / មតិយោបល់អ្នកវាយតម្លៃ
        </h2>
        <textarea
          disabled={isViewOnly || (!canEditSuper && !canEditSupporter && !canEditMgmt && !canEditAsp)}
          className="w-full px-4 py-3 rounded-2xl border border-slate-200/60 dark:border-white/[0.1] bg-white/60 dark:bg-white/[0.04] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none font-medium text-sm disabled:opacity-60"
          rows={4}
          value={formData.evaluatorComments}
          onChange={e => setFormData({...formData, evaluatorComments: e.target.value})}
          placeholder="Enter evaluator comments here..."
        />
      </div>

      {/* ─── Final Score & Submit ─── */}
      <div className="glass-card-strong rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-indigo-500/20 dark:border-indigo-400/10 print:bg-transparent print:border-none print:shadow-none print:rounded-none">
        <div className="text-center sm:text-left">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Final Evaluation Rating / ពិន្ទុចុងក្រោយ</div>
          <div className="flex items-center gap-4 justify-center sm:justify-start">
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
              {overallScore.toFixed(1)}
              <span className="text-lg sm:text-xl text-slate-400 dark:text-slate-500 font-medium ml-1">/ 100</span>
            </div>
            <div className="text-xs sm:text-sm font-bold px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              {getRating(overallScore).label}
            </div>
          </div>
        </div>
        {!isViewOnly && (!isCompleted || superadminEdit) && (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button type="button" onClick={(e) => handleActionSubmit(e, 'save')} disabled={loading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 glass-card rounded-2xl text-slate-700 dark:text-slate-300 font-bold text-sm transition-all active:scale-95 disabled:opacity-50">
              Draft
            </button>
            {canReject && (
              <button type="button" onClick={handleReject} disabled={loading}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold text-sm rounded-2xl shadow-lg shadow-rose-500/25 transition-all active:scale-95 disabled:opacity-50">
                {isCompleted ? 'Reopen' : 'Return'}
              </button>
            )}
            {canReopen && (
              <button type="button" onClick={(e) => { if (confirm('Reopen this evaluation? This will reset its status to Draft.')) handleActionSubmit(e, 'reopen'); }} disabled={loading}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-sm rounded-2xl shadow-lg shadow-amber-500/25 transition-all active:scale-95 disabled:opacity-50">
                Reset
              </button>
            )}
            <button type="submit" disabled={loading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 sm:px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-500/25 transition-all active:scale-95 disabled:opacity-50">
              <Save size={18} />
              {loading ? 'Saving...' : 'Submit'}
            </button>
          </div>
        )}
      </div>

      {/* ─── Print Signature ─── */}
      <div className="hidden print:block mt-16 pt-8">
        <div className="mb-12">
          <span className="font-bold text-slate-700">Approval Status:</span>
          <span className={cn("ml-2 font-bold px-3 py-1 rounded border",
            (formData.status === 'Approved' || formData.status === 'Completed') ? "text-emerald-600 border-emerald-600" : "text-amber-600 border-amber-600"
          )}>
            {STATUS_LABELS[formData.status]?.kh || formData.status}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-8">
          {[['Appraiser', 'ហត្ថលេខាអ្នកវាយតម្លៃ'], ['Reviewer', 'ហត្ថលេខាអ្នកត្រួតពិនិត្យ'], ['Employee', 'ហត្ថលេខាអ្នកទទួល']].map(([en, kh]) => (
            <div key={en} className="text-center">
              <p className="font-bold text-sm mb-16">{kh} / {en}</p>
              <div className="border-t border-slate-400 w-48 mx-auto"></div>
              <p className="mt-2 text-xs">Date / កាលបរិច្ឆេទ: ........................</p>
            </div>
          ))}
        </div>
      </div>
    </form>
  );
}

function getRating(score: number) {
  if (score >= 95) return { label: 'Outstanding', khLabel: 'ល្អប្រសើរបំផុត' };
  if (score >= 90) return { label: 'Excellent', khLabel: 'ល្អ' };
  if (score >= 70) return { label: 'Very Good', khLabel: 'ល្អបង្គួរ' };
  if (score >= 60) return { label: 'Good', khLabel: 'មធ្យម' };
  return { label: 'Needs Improvement', khLabel: 'ត្រូវកែលម្អ' };
}

function ScoreInput({ value, max, disabled, color, onChange }: {
  value: number; max: number; disabled: boolean;
  color: 'slate' | 'indigo' | 'teal' | 'amber' | 'rose';
  onChange: (v: string) => void;
}) {
  const colorMap = {
    slate: { border: 'border-slate-200 dark:border-slate-700', bg: 'bg-white dark:bg-slate-800', text: 'text-slate-900 dark:text-slate-100', focus: 'focus:ring-slate-500' },
    indigo: { border: 'border-indigo-200 dark:border-indigo-500/30', bg: 'bg-indigo-50/50 dark:bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-400', focus: 'focus:ring-indigo-500' },
    teal: { border: 'border-teal-200 dark:border-teal-500/30', bg: 'bg-teal-50/50 dark:bg-teal-500/10', text: 'text-teal-700 dark:text-teal-400', focus: 'focus:ring-teal-500' },
    amber: { border: 'border-amber-200 dark:border-amber-500/30', bg: 'bg-amber-50/50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', focus: 'focus:ring-amber-500' },
    rose: { border: 'border-rose-200 dark:border-rose-500/30', bg: 'bg-rose-50/50 dark:bg-rose-500/10', text: 'text-rose-700 dark:text-rose-400', focus: 'focus:ring-rose-500' },
  };
  const c = colorMap[color];

  if (disabled) {
    return (
      <div className={cn("w-full px-3 py-2 text-center rounded-xl text-sm font-bold", c.text, "print:p-0")}>
        {value > 0 ? value.toFixed(1) : <span className="text-slate-300 dark:text-slate-600">—</span>}
      </div>
    );
  }

  return (
    <input type="number" step="0.5" min="0" max={max}
      className={cn("w-full px-3 py-2 text-center rounded-xl border font-bold text-lg outline-none transition-all focus:ring-2", c.border, c.bg, c.text, c.focus, "print:border-none print:p-0")}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  );
}

function Input({ label, value, onChange, onBlur, type = "text", required = false, disabled = false }: {
  label: React.ReactNode; value: string; onChange: (v: string) => void; onBlur?: () => void;
  type?: string; required?: boolean; disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{label}</label>
      <input type={type} required={required} disabled={disabled}
        className="w-full px-4 py-3 rounded-2xl border border-slate-200/60 dark:border-white/[0.1] bg-white/60 dark:bg-white/[0.06] backdrop-blur-xl focus:ring-2 focus:ring-indigo-500 font-medium text-sm text-slate-900 dark:text-slate-100 outline-none transition-all disabled:opacity-60"
        value={value} onChange={e => onChange(e.target.value)} onBlur={onBlur} />
    </div>
  );
}

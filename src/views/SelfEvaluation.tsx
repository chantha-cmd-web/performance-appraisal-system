import { apiFetch } from '../mockApi';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { usePositionFormConfigs } from '../hooks/useSettings';
import { PREDEFINED_POSITIONS, PositionFormConfig } from '../types';
import { ClipboardCheck, ArrowRight, FileText, Clock, CheckCircle2, AlertTriangle, Briefcase } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export default function SelfEvaluation() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { configs, loading: configsLoading } = usePositionFormConfigs();
  const [myEvaluations, setMyEvaluations] = useState<any[]>([]);
  const [loadingEvals, setLoadingEvals] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    fetchMyEvaluations();
  }, [token]);

  const fetchMyEvaluations = async () => {
    try {
      const res = await apiFetch('/api/evaluations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const mine = data.filter((ev: any) => ev.employeeId === user?.id);
        setMyEvaluations(mine);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEvals(false);
    }
  };

  const getPositionConfig = (position: string): PositionFormConfig | undefined => {
    return configs?.find(c => c.position === position);
  };

  const getPositionStatus = (position: string) => {
    const ev = myEvaluations.find(
      e => e.position === position && e.status !== 'Completed' && e.status !== 'Approved'
    );
    if (ev) return { status: 'in_progress', evaluation: ev };
    const completed = myEvaluations.find(
      e => e.position === position && (e.status === 'Completed' || e.status === 'Approved')
    );
    if (completed) return { status: 'completed', evaluation: completed };
    return { status: 'none', evaluation: null };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Returned to Employee':
        return { label: 'Returned - Please Revise', color: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400' };
      case 'Waiting for Supervisor':
        return { label: 'Under Supervisor Review', color: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400' };
      case 'Waiting for Supporter':
        return { label: 'Under Supporter Review', color: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' };
      default:
        return { label: status, color: 'bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-400' };
    }
  };

  const handlePositionSelect = async (position: string) => {
    const config = getPositionConfig(position);
    if (!config) {
      alert(`No evaluation form configured for "${position}". Please contact your administrator.`);
      return;
    }

    const posStatus = getPositionStatus(position);
    if (posStatus.status === 'in_progress' && posStatus.evaluation) {
      navigate(`/evaluation?id=${posStatus.evaluation.id}`);
      return;
    }

    setCreating(position);
    try {
      const empRes = await apiFetch(`/api/employees?id=${user?.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let empData: any = null;
      if (empRes.ok) {
        empData = await empRes.json();
      }

      const evalType = 'management';
      const weightScheme = empData?.evalModel || config.weightingScheme || '';

      const posActiveCriteria = config.criteria.filter(c => c.status === 'active');

      const newEval = {
        employeeId: user?.id || '',
        employeeName: empData ? empData.name + (empData.khmerName ? ` (${empData.khmerName})` : '') : user?.name || '',
        campus: empData?.campus || '',
        department: empData?.department || '',
        position: position,
        category: empData?.category || '',
        appraiser: empData?.supervisorId || '',
        supporter: empData?.supporterId || '',
        evalPeriod: empData?.evalPeriod || '',
        reviewDate: format(new Date(), 'yyyy-MM-dd'),
        weightScheme: weightScheme,
        evaluationType: evalType,
        status: 'Draft',
        totalSelf: 0,
        totalSuper: 0,
        overallScore: 0,
        criteriaScores: posActiveCriteria.map(c => ({
          criteriaId: c.id,
          selfScore: 0,
          superScore: 0,
          supporterScore: 0,
          managementScore: 0,
          aspScore: 0,
        })),
        peerFeedbacks: [],
        evaluatorComments: '',
        createdBy: user?.id,
        createdByName: user?.name,
      };

      const res = await apiFetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newEval)
      });

      if (res.ok) {
        const result = await res.json();
        const newId = result.id;
        await apiFetch('/api/audit-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            userId: user?.id,
            userName: user?.name,
            action: 'create_self_evaluation',
            details: `Created self-evaluation for position: ${position} (type: ${evalType})`
          })
        });
        navigate(`/evaluation?id=${newId}`);
      } else {
        alert('Failed to create evaluation. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating evaluation.');
    } finally {
      setCreating(null);
    }
  };

  if (configsLoading || loadingEvals) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-400">Loading self-evaluation...</span>
        </div>
      </div>
    );
  }

  const configuredPositions = configs?.map(c => c.position) || [];
  const allPositions = [...new Set([...PREDEFINED_POSITIONS, ...configuredPositions])];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
            Self-Evaluation
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            ការវាយតម្លៃខ្លួនឯង • Select your position to begin or continue your self-evaluation
          </p>
        </div>
      </div>

      {/* Active Evaluations Banner */}
      {myEvaluations.filter(ev => ev.status !== 'Completed' && ev.status !== 'Approved').length > 0 && (
        <div className="glass-card-strong rounded-3xl p-5 sm:p-6 border-l-4 border-amber-500">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">Active Evaluations</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                You have {myEvaluations.filter(ev => ev.status !== 'Completed' && ev.status !== 'Approved').length} evaluation(s) in progress.
                Click the position below to continue.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Position Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {allPositions.map(position => {
          const config = getPositionConfig(position);
          const posStatus = getPositionStatus(position);
          const hasConfig = !!config;
          const isActive = posStatus.status === 'in_progress';
          const isCompleted = posStatus.status === 'completed';
          const isCreating = creating === position;

          return (
            <button
              key={position}
              onClick={() => handlePositionSelect(position)}
              disabled={isCreating}
              className={cn(
                "group relative text-left p-5 sm:p-6 rounded-2xl border-2 transition-all duration-200",
                isActive
                  ? "border-amber-400 dark:border-amber-500/50 bg-amber-50/80 dark:bg-amber-500/5 shadow-lg shadow-amber-500/10"
                  : isCompleted
                    ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5"
                    : hasConfig
                      ? "border-slate-200/60 dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.03] hover:border-indigo-300 dark:hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/10 cursor-pointer"
                      : "border-dashed border-slate-300 dark:border-white/[0.08] bg-white/40 dark:bg-white/[0.02] hover:border-indigo-300 dark:hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/10 cursor-pointer opacity-70 hover:opacity-100"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl",
                  isActive
                    ? "bg-amber-100 dark:bg-amber-500/20"
                    : isCompleted
                      ? "bg-emerald-100 dark:bg-emerald-500/20"
                      : "bg-indigo-100 dark:bg-indigo-500/20"
                )}>
                  {isActive ? (
                    <Clock size={20} className="text-amber-600 dark:text-amber-400" />
                  ) : isCompleted ? (
                    <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Briefcase size={20} className="text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>
                {hasConfig && !isCreating && (
                  <ArrowRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                )}
                {isCreating && (
                  <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                )}
              </div>

              <h3 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base mb-1">{position}</h3>

              {config ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <ClipboardCheck size={12} />
                    <span>{config.sections.filter(s => s.status === 'active').length} sections</span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span>{config.criteria.filter(c => c.status === 'active').length} criteria</span>
                  </div>
                  {isActive && posStatus.evaluation && (
                    <div className="flex items-center gap-1.5 mt-2">
                      {(() => {
                        const badge = getStatusBadge(posStatus.evaluation.status);
                        return (
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold", badge.color)}>
                            {badge.label}
                          </span>
                        );
                      })()}
                    </div>
                  )}
                  {isCompleted && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                        Score: {posStatus.evaluation.overallScore?.toFixed(1) || '—'}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                  No form configured
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Info Section */}
      <div className="glass-card-strong rounded-3xl p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <FileText size={18} className="text-indigo-500 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-1">
            <p className="font-bold text-slate-700 dark:text-slate-300">How Self-Evaluation Works:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Select your position from the cards above</li>
              <li>Evaluation Type and Weighting Scheme are auto-loaded from your profile</li>
              <li>Complete the self-evaluation form with your scores</li>
              <li>Submit your evaluation when ready</li>
              <li>Your supervisor will review and add their evaluation</li>
              <li>The evaluation moves through the workflow until completion</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

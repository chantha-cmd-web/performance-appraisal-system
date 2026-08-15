import { User, Evaluation, PositionFormConfig, CriteriaScore } from '../types';

export type Role = 'superadmin' | 'admin' | 'supervisor' | 'supporter' | 'employee';

export const isAdmin = (user: User | null): boolean =>
  user?.role === 'superadmin' || user?.role === 'admin';

export const isSuperAdmin = (user: User | null): boolean =>
  user?.role === 'superadmin';

export const isSupervisor = (user: User | null): boolean =>
  user?.role === 'supervisor';

export const isSupporter = (user: User | null): boolean =>
  user?.role === 'supporter';

export const isEmployee = (user: User | null): boolean =>
  user?.role === 'employee';

// Route access
export const canAccessAdminPage = (user: User | null): boolean =>
  isAdmin(user);

// Data export / import / admin functions
export const canExportData = (user: User | null): boolean =>
  isAdmin(user);

export const canManageUsers = (user: User | null): boolean =>
  isAdmin(user);

// Can view all reports (vs only own)
export const canViewAllReports = (user: User | null): boolean =>
  isAdmin(user);

// Dashboard: which evaluations can this user see?
export function filterEvaluationsByRole(evals: Evaluation[], user: User | null): Evaluation[] {
  if (!Array.isArray(evals)) return [];
  if (!user) return [];
  if (isAdmin(user)) return evals;

  return evals.filter(ev => {
    const appraiser = String(ev.appraiser || '').trim().toLowerCase();
    const supporter = String(ev.supporter || '').trim().toLowerCase();
    const employeeId = String(ev.employeeId || '').trim().toLowerCase();
    const employeeName = String(ev.employeeName || '').trim().toLowerCase();
    const createdBy = String(ev.createdBy || '').trim().toLowerCase();

    const userId = String(user.id || '').trim().toLowerCase();
    const userName = String(user.name || '').trim().toLowerCase();

    const isAppraiser = appraiser === userId || appraiser === userName;
    const isSupporter = supporter === userId || supporter === userName;
    const isEmployee = employeeId === userId || employeeName === userName || employeeName.includes(userName);
    const isCreator = createdBy === userId || createdBy === userName;

    if (user.role === 'supervisor') return isAppraiser || isCreator;
    if (user.role === 'supporter') return isSupporter || isCreator;
    if (user.role === 'employee') return isEmployee;
    return false;
  });
}

// Dashboard: can this user see the evaluator column?
export const canSeeEvaluatorColumn = (user: User | null): boolean =>
  isAdmin(user);

// Dashboard action buttons
export function canEditEvaluation(ev: Evaluation, user: User | null): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  const status = ev.status || 'Draft';
  const createdBy = String(ev.createdBy || '').trim().toLowerCase();
  const employeeId = String(ev.employeeId || '').trim().toLowerCase();
  const employeeName = String(ev.employeeName || '').trim().toLowerCase();
  const appraiser = String(ev.appraiser || '').trim().toLowerCase();
  const supporter = String(ev.supporter || '').trim().toLowerCase();

  const userId = String(user.id || '').trim().toLowerCase();
  const userName = String(user.name || '').trim().toLowerCase();

  const isCreator = createdBy === userId || createdBy === userName;
  const isEmployee = employeeId === userId || employeeName === userName || employeeName.includes(userName);
  const isAppraiser = appraiser === userId || appraiser === userName;
  const isSupporter = supporter === userId || supporter === userName;

  if (isCreator && status === 'Draft') return true;
  if (isEmployee && (status === 'Draft' || status === 'Self Evaluation Pending' || status === 'Returned to Employee')) return true;
  if (isAppraiser && (status === 'Waiting for Supervisor' || status === 'Waiting for Reviews')) return true;
  if (isSupporter && (status === 'Waiting for Supporter' || status === 'Waiting for Reviews')) return true;
  return false;
}

export function canDeleteEvaluation(ev: Evaluation, user: User | null): boolean {
  if (!user) return false;
  const createdBy = String(ev.createdBy || '').trim().toLowerCase();
  const userId = String(user.id || '').trim().toLowerCase();
  return isAdmin(user) || createdBy === userId;
}

export function canEvaluate(ev: Evaluation, user: User | null): boolean {
  if (!user) return false;
  const status = ev.status || 'Draft';
  const appraiser = String(ev.appraiser || '').trim().toLowerCase();
  const supporter = String(ev.supporter || '').trim().toLowerCase();
  const employeeId = String(ev.employeeId || '').trim().toLowerCase();
  const employeeName = String(ev.employeeName || '').trim().toLowerCase();

  const userId = String(user.id || '').trim().toLowerCase();
  const userName = String(user.name || '').trim().toLowerCase();

  const isAppraiser = appraiser === userId || appraiser === userName;
  const isSupporter = supporter === userId || supporter === userName;
  const isEmployee = employeeId === userId || employeeName === userName || employeeName.includes(userName);

  if (isEmployee && (status === 'Draft' || status === 'Self Evaluation Pending' || status === 'Returned to Employee')) return true;
  if (isAppraiser && (status === 'Waiting for Supervisor' || status === 'Waiting for Reviews')) return true;
  if (isSupporter && (status === 'Waiting for Supporter' || status === 'Waiting for Reviews')) return true;
  return false;
}

// ─── EvaluationForm Section Editing Permissions ───
// The employee score (self column) comes ONLY from the employee themselves.
// The assigned supervisor fills the supervisor column and the assigned
// supporter fills the supporter column — nobody else (including plain admins)
// may write another evaluator's score. Superadmin keeps an explicit override.
export function canEditSelfEval(
  user: User | null,
  evalData: { employeeId: string; status: string },
  isViewOnly: boolean
): boolean {
  if (isViewOnly) return false;
  // Superadmin retains an explicit override for corrections.
  if (isSuperAdmin(user)) return true;
  // Self-eval is only editable by the employee themselves, during Draft, Self Eval Pending, or Returned
  const employeeId = String(evalData.employeeId || '').trim().toLowerCase();
  const userId = String(user?.id || '').trim().toLowerCase();
  if (userId === employeeId && (evalData.status === 'Draft' || evalData.status === 'Self Evaluation Pending' || evalData.status === 'Returned to Employee')) return true;
  return false;
}

// Supervisor section: ONLY the assigned appraiser — the supervisor the employee
// selected on their profile (employee ID → supervisorId → appraiser) — can edit,
// and only during "Waiting for Supervisor" or "Waiting for Reviews". Plain
// admins and employees are NOT allowed to fill in the supervisor's score.
export function canEditSupervisorSection(
  user: User | null,
  evalData: { appraiser: string; status: string },
  isViewOnly: boolean
): boolean {
  if (isViewOnly) return false;
  // Superadmin retains an explicit override for corrections.
  if (isSuperAdmin(user)) return true;
  const appraiserId = String(evalData.appraiser || '').trim().toLowerCase();
  const userId = String(user?.id || '').trim().toLowerCase();
  if (appraiserId === userId && (evalData.status === 'Waiting for Supervisor' || evalData.status === 'Waiting for Reviews')) return true;
  return false;
}

// Supporter section: ONLY the assigned supporter can edit, during "Waiting for
// Supporter" or "Waiting for Reviews". Admins/employees cannot fill it.
export function canEditSupporterSection(
  user: User | null,
  evalData: { supporter: string; status: string },
  isViewOnly: boolean
): boolean {
  if (isViewOnly) return false;
  // Superadmin retains an explicit override for corrections.
  if (isSuperAdmin(user)) return true;
  const supporterId = String(evalData.supporter || '').trim().toLowerCase();
  const userId = String(user?.id || '').trim().toLowerCase();
  if (supporterId === userId && (evalData.status === 'Waiting for Supporter' || evalData.status === 'Waiting for Reviews')) return true;
  return false;
}

// Management section: only admin can edit (management_100 scheme)
export function canEditManagementSection(
  user: User | null,
  isViewOnly: boolean
): boolean {
  if (isViewOnly) return false;
  return isAdmin(user);
}

// ASP section: only admin can edit (asp_100 scheme)
export function canEditAspSection(
  user: User | null,
  isViewOnly: boolean
): boolean {
  if (isViewOnly) return false;
  return isAdmin(user);
}

// Can this user create a new evaluation?
export function canCreateEvaluation(user: User | null): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (user.role === 'employee') return true;
  return false;
}

// Determine which evaluator columns to show based on the weighting scheme
export function getVisibleColumns(weightScheme: string) {
  return {
    self: true, // Always visible — self-eval data is always shown
    super: ['campus_60_40', 'campus_50_50', 'campus_100', 'central_100'].includes(weightScheme),
    supporter: ['campus_60_40', 'campus_50_50'].includes(weightScheme),
    management: weightScheme === 'management_100',
    asp: weightScheme === 'asp_100',
  };
}

export interface SectionInfo {
  sections: Array<{ id: string; weight: number; name?: string; khName?: string }>;
  criteria: Array<{ id: number; sectionId?: string; max: number }>;
  criteriaScores: Array<CriteriaScore>;
}

// Compute a section-weighted score for a single evaluator column.
// Formula per spec:
//   Section % = (section_sum / section_max) × 100
//   Evaluator Total = Σ (section_pct × section_weight / 100)
// Result is on a 0–100 scale.
export function computeSectionWeightedScore(
  evaluatorColumn: 'selfScore' | 'superScore' | 'supporterScore' | 'managementScore' | 'aspScore',
  sectionInfo: SectionInfo
): number {
  const { sections, criteria, criteriaScores } = sectionInfo;
  if (!sections || sections.length === 0) return 0;

  let weightedTotal = 0;
  for (const section of sections) {
    const sectionCriteria = criteria.filter(c => c.sectionId === section.id);
    if (sectionCriteria.length === 0) continue;
    const sectionMax = sectionCriteria.reduce((sum, c) => sum + (c.max || 10), 0);
    if (sectionMax === 0) continue;

    const sectionSum = criteriaScores
      .filter(cs => sectionCriteria.some(c => String(c.id) === String(cs.criteriaId)))
      .reduce((sum, cs) => sum + ((cs as any)[evaluatorColumn] || 0), 0);

    const sectionPct = (sectionSum / sectionMax) * 100;
    weightedTotal += sectionPct * (section.weight / 100);
  }

  return weightedTotal;
}

// Compute section-level subtotals for display.
// Returns an array of { sectionId, name, khName, weight, total, max, pct } per evaluator.
export function computeSectionSubtotals(
  evaluatorColumn: 'selfScore' | 'superScore' | 'supporterScore' | 'managementScore' | 'aspScore',
  sectionInfo: SectionInfo
): Array<{ sectionId: string; name: string; khName: string; weight: number; total: number; max: number; pct: number }> {
  const { sections, criteria, criteriaScores } = sectionInfo;
  if (!sections || sections.length === 0) return [];

  return sections.map(section => {
    const sectionCriteria = criteria.filter(c => c.sectionId === section.id);
    const sectionMax = sectionCriteria.reduce((sum, c) => sum + (c.max || 10), 0);
    const sectionSum = criteriaScores
      .filter(cs => sectionCriteria.some(c => String(c.id) === String(cs.criteriaId)))
      .reduce((sum, cs) => sum + ((cs as any)[evaluatorColumn] || 0), 0);
    const sectionPct = sectionMax > 0 ? (sectionSum / sectionMax) * 100 : 0;
    return {
      sectionId: section.id,
      name: section.name || section.id,
      khName: section.khName || section.name || section.id,
      weight: section.weight,
      total: sectionSum,
      max: sectionMax,
      pct: sectionPct,
    };
  });
}

// Calculate the overall score based on the weighting scheme.
// When sectionInfo is provided, each evaluator's score is computed with section-level weights
// (Personal Characteristic at configured weight, Evaluation Skill at configured weight).
// Then evaluator totals are combined using the condition weight (60/40, 50/50, 100, etc.).
export function calculateOverallScore(
  weightScheme: string,
  totals: { self: number; super: number; supporter: number; management: number; asp: number },
  maxPossible: number,
  peerAvgBonus: number = 0,
  sectionInfo?: SectionInfo
): number {
  let superPct: number;
  let supporterPct: number;
  let managementPct: number;
  let aspPct: number;

  if (sectionInfo && sectionInfo.sections.length > 0 && sectionInfo.criteria.length > 0) {
    superPct = computeSectionWeightedScore('superScore', sectionInfo);
    supporterPct = computeSectionWeightedScore('supporterScore', sectionInfo);
    managementPct = computeSectionWeightedScore('managementScore', sectionInfo);
    aspPct = computeSectionWeightedScore('aspScore', sectionInfo);
  } else {
    // Fallback: simple normalization when no section info available
    superPct = maxPossible > 0 ? (totals.super / maxPossible) * 100 : 0;
    supporterPct = maxPossible > 0 ? (totals.supporter / maxPossible) * 100 : 0;
    managementPct = maxPossible > 0 ? (totals.management / maxPossible) * 100 : 0;
    aspPct = maxPossible > 0 ? (totals.asp / maxPossible) * 100 : 0;
  }

  let raw = 0;
  switch (weightScheme) {
    case 'campus_60_40':
      raw = superPct * 0.6 + supporterPct * 0.4;
      break;
    case 'campus_50_50':
      raw = superPct * 0.5 + supporterPct * 0.5;
      break;
    case 'management_100':
      raw = managementPct;
      break;
    case 'asp_100':
      raw = aspPct;
      break;
    case 'campus_100':
    case 'central_100':
    default:
      raw = superPct;
      break;
  }

  // Peer feedback bonus (max ~5 points)
  raw += peerAvgBonus;

  return Math.min(100, Math.max(0, raw));
}

// Status transition: what status can this user advance to?
export function getNextStatus(
  currentStatus: string,
  action: 'save' | 'submit' | 'reject' | 'reopen',
  showSupporter: boolean,
  userRole?: string
): string {
  if (action === 'save') return currentStatus;
  if (action === 'reject') return 'Returned to Employee';
  if (action === 'reopen') return 'Draft';

  switch (currentStatus) {
    case 'Draft':
    case 'Self Evaluation Pending':
    case 'Returned to Employee':
      return showSupporter ? 'Waiting for Reviews' : 'Waiting for Supervisor';
    case 'Waiting for Reviews':
      if (userRole === 'superadmin') return 'Completed';
      if (userRole === 'supporter') {
        return 'Waiting for Supervisor';
      }
      return 'Waiting for Supporter';
    case 'Waiting for Supervisor':
      return 'Completed';
    case 'Waiting for Supporter':
      return 'Completed';
    default:
      return currentStatus;
  }
}

// Can this user reopen a completed/approved evaluation back to Draft?
export function canReopenEvaluation(
  user: User | null,
  evalData: { status: string }
): boolean {
  if (!user) return false;
  if (!isSuperAdmin(user)) return false;
  return evalData.status === 'Completed' || evalData.status === 'Approved';
}

// Can this user reject/return an evaluation?
export function canRejectEvaluation(
  user: User | null,
  evalData: { appraiser: string; supporter: string; status: string }
): boolean {
  if (!user) return false;
  // Superadmin can always reject/return regardless of status
  if (isSuperAdmin(user)) return true;
  if (evalData.status === 'Completed' || evalData.status === 'Approved') return false;
  
  const appraiserId = String(evalData.appraiser || '').trim().toLowerCase();
  const supporterId = String(evalData.supporter || '').trim().toLowerCase();
  const userId = String(user.id || '').trim().toLowerCase();

  if (appraiserId === userId && evalData.status === 'Waiting for Supervisor') return true;
  if (supporterId === userId && evalData.status === 'Waiting for Supporter') return true;
  return false;
}

// Determine the current workflow stage label
export function getWorkflowStage(status: string): string {
  switch (status) {
    case 'Draft': return 'Self-Evaluation';
    case 'Self Evaluation Pending': return 'Self-Evaluation';
    case 'Returned to Employee': return 'Returned for Revision';
    case 'Waiting for Reviews': return 'Pending Reviews';
    case 'Waiting for Supervisor': return 'Supervisor Review';
    case 'Supervisor Completed': return 'Supervisor Review';
    case 'Waiting for Supporter': return 'Supporter Review';
    case 'Supporter Completed': return 'Finalization';
    case 'Completed': return 'Completed';
    case 'Approved': return 'Approved';
    default: return 'Draft';
  }
}

// Check if a specific stage is locked for the given user/status combination
export function isStageLocked(
  stage: 'self' | 'supervisor' | 'supporter' | 'management' | 'asp',
  status: string,
  user: User | null,
  evalData: { employeeId: string; appraiser: string; supporter: string }
): boolean {
  // If completed/approved, everything is locked — unless superadmin
  if (status === 'Completed' || status === 'Approved') {
    return !isSuperAdmin(user);
  }

  // Superadmin has full access to all stages
  if (isSuperAdmin(user)) return false;

  const employeeId = String(evalData.employeeId || '').trim().toLowerCase();
  const appraiserId = String(evalData.appraiser || '').trim().toLowerCase();
  const supporterId = String(evalData.supporter || '').trim().toLowerCase();
  const userId = String(user?.id || '').trim().toLowerCase();

  switch (stage) {
    case 'self':
      return status !== 'Draft' && status !== 'Self Evaluation Pending' && status !== 'Returned to Employee';
    case 'supervisor':
      return !((status === 'Waiting for Supervisor' || status === 'Waiting for Reviews') && userId === appraiserId);
    case 'supporter':
      return !((status === 'Waiting for Supporter' || status === 'Waiting for Reviews') && userId === supporterId);
    case 'management':
    case 'asp':
      return status === 'Completed' || status === 'Approved' || !isSuperAdmin(user);
    default:
      return true;
  }
}

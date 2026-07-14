import { User, Evaluation } from '../types';

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
  isSuperAdmin(user);

// Dashboard: which evaluations can this user see?
export function filterEvaluationsByRole(evals: Evaluation[], user: User | null): Evaluation[] {
  if (!user) return [];
  if (isAdmin(user)) return evals;

  return evals.filter(ev => {
    if (user.role === 'supervisor') return ev.appraiser === user.id;
    if (user.role === 'supporter') return ev.supporter === user.id;
    if (user.role === 'employee') return ev.employeeId === user.id;
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
  if (ev.createdBy === user.id && status === 'Draft') return true;
  if (ev.employeeId === user.id && (status === 'Draft' || status === 'Self Evaluation Pending')) return true;
  if (ev.appraiser === user.id && status === 'Waiting for Supervisor') return true;
  if (ev.supporter === user.id && status === 'Waiting for Supporter') return true;
  return false;
}

export function canDeleteEvaluation(ev: Evaluation, user: User | null): boolean {
  if (!user) return false;
  return isAdmin(user) || ev.createdBy === user.id;
}

export function canEvaluate(ev: Evaluation, user: User | null): boolean {
  if (!user) return false;
  const status = ev.status || 'Draft';
  if (ev.appraiser === user.id && status === 'Waiting for Supervisor') return true;
  if (ev.supporter === user.id && status === 'Waiting for Supporter') return true;
  return false;
}

// ─── EvaluationForm Section Editing Permissions ───
// Admin CANNOT edit Self-Eval scores. Only the employee can edit their own self-eval,
// and only while the status is Draft or Self Evaluation Pending.
export function canEditSelfEval(
  user: User | null,
  evalData: { employeeId: string; status: string },
  isViewOnly: boolean
): boolean {
  if (isViewOnly) return false;
  // Self-eval is only editable by the employee themselves, during Draft or Self Eval Pending
  if (user?.id === evalData.employeeId && (evalData.status === 'Draft' || evalData.status === 'Self Evaluation Pending')) return true;
  // Admin/Supervisor/Supporter can NEVER edit self-eval scores
  return false;
}

// Supervisor section: only the assigned appraiser can edit, only when status is "Waiting for Supervisor"
export function canEditSupervisorSection(
  user: User | null,
  evalData: { appraiser: string; status: string },
  isViewOnly: boolean
): boolean {
  if (isViewOnly) return false;
  if (evalData.appraiser === user?.id && evalData.status === 'Waiting for Supervisor') return true;
  return false;
}

// Supporter section: only the assigned supporter can edit, only when status is "Waiting for Supporter"
export function canEditSupporterSection(
  user: User | null,
  evalData: { supporter: string; status: string },
  isViewOnly: boolean
): boolean {
  if (isViewOnly) return false;
  if (evalData.supporter === user?.id && evalData.status === 'Waiting for Supporter') return true;
  return false;
}

// Management section: only admin/superadmin can edit (management_100 scheme)
export function canEditManagementSection(
  user: User | null,
  isViewOnly: boolean
): boolean {
  if (isViewOnly) return false;
  return isAdmin(user);
}

// ASP section: only admin/superadmin can edit (asp_100 scheme)
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

// Calculate the overall score based on the weighting scheme
export function calculateOverallScore(
  weightScheme: string,
  totals: { self: number; super: number; supporter: number; management: number; asp: number },
  maxPossible: number,
  peerAvgBonus: number = 0
): number {
  let raw = 0;
  switch (weightScheme) {
    case 'campus_60_40':
      raw = (totals.super * 0.6) + (totals.supporter * 0.4);
      break;
    case 'campus_50_50':
      raw = (totals.super * 0.5) + (totals.supporter * 0.5);
      break;
    case 'management_100':
      raw = totals.management;
      break;
    case 'asp_100':
      raw = totals.asp;
      break;
    case 'campus_100':
    case 'central_100':
    default:
      raw = totals.super;
      break;
  }

  // Normalize to 100
  if (maxPossible > 0) {
    raw = (raw / maxPossible) * 100;
  }

  // Peer feedback bonus (max ~5 points)
  raw += peerAvgBonus;

  return Math.min(100, Math.max(0, raw));
}

// Status transition: what status can this user advance to?
export function getNextStatus(
  currentStatus: string,
  action: 'save' | 'submit',
  showSupporter: boolean
): string {
  if (action === 'save') return currentStatus;

  switch (currentStatus) {
    case 'Draft':
    case 'Self Evaluation Pending':
      return 'Waiting for Supervisor';
    case 'Waiting for Supervisor':
      return showSupporter ? 'Waiting for Supporter' : 'Completed';
    case 'Waiting for Supporter':
      return 'Completed';
    default:
      return currentStatus;
  }
}

// Determine the current workflow stage label
export function getWorkflowStage(status: string): string {
  switch (status) {
    case 'Draft': return 'Self-Evaluation';
    case 'Self Evaluation Pending': return 'Self-Evaluation';
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
  // If completed/approved, everything is locked
  if (status === 'Completed' || status === 'Approved') return true;

  switch (stage) {
    case 'self':
      // Self-eval is locked once we move past Draft/Self Eval Pending
      // OR if the current user is not the employee
      return status !== 'Draft' && status !== 'Self Evaluation Pending';
    case 'supervisor':
      // Supervisor section only editable when status is "Waiting for Supervisor" AND user is the appraiser
      return !(status === 'Waiting for Supervisor' && user?.id === evalData.appraiser);
    case 'supporter':
      // Supporter section only editable when status is "Waiting for Supporter" AND user is the supporter
      return !(status === 'Waiting for Supporter' && user?.id === evalData.supporter);
    case 'management':
    case 'asp':
      // Management/ASP sections are editable by admin when status is not completed
      return status === 'Completed' || status === 'Approved' || !isAdmin(user);
    default:
      return true;
  }
}

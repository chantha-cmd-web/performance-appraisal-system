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
    if (user.role === 'supervisor') {
      return ev.appraiser === user.id;
    }
    if (user.role === 'supporter') {
      return ev.supporter === user.id;
    }
    if (user.role === 'employee') {
      return ev.employeeId === user.id;
    }
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

// EvaluationForm: section editing permissions
export function canEditSelfEval(
  user: User | null,
  evalData: { employeeId: string; status: string },
  isViewOnly: boolean
): boolean {
  if (isViewOnly) return false;
  if (isAdmin(user)) return true;
  if (user?.id === evalData.employeeId && (evalData.status === 'Draft' || evalData.status === 'Self Evaluation Pending')) return true;
  return false;
}

export function canEditSupervisorSection(
  user: User | null,
  evalData: { appraiser: string; status: string },
  isViewOnly: boolean
): boolean {
  if (isViewOnly) return false;
  if (isAdmin(user)) return true;
  if (evalData.appraiser === user?.id && evalData.status === 'Waiting for Supervisor') return true;
  return false;
}

export function canEditSupporterSection(
  user: User | null,
  evalData: { supporter: string; status: string },
  isViewOnly: boolean
): boolean {
  if (isViewOnly) return false;
  if (isAdmin(user)) return true;
  if (evalData.supporter === user?.id && evalData.status === 'Waiting for Supporter') return true;
  return false;
}

export function canEditManagementSection(
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

// Status transition: what status can this user advance to?
export function getNextStatus(
  currentStatus: string,
  action: 'save' | 'submit',
  showSupporter: boolean
): string {
  if (action === 'save') return currentStatus;
  if (currentStatus === 'Draft' || currentStatus === 'Self Evaluation Pending') return 'Waiting for Supervisor';
  if (currentStatus === 'Waiting for Supervisor') return showSupporter ? 'Waiting for Supporter' : 'Completed';
  if (currentStatus === 'Waiting for Supporter') return 'Completed';
  return currentStatus;
}

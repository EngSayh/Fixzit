import { NextRequest, NextResponse } from 'next/server';
import {
  ROLE_MODULE_ACCESS,
  ROLE_ACTIONS,
  PLAN_GATES,
  Role,
  ModuleKey,
  SubmoduleKey,
  Action,
  Plan,
} from '@/domain/fm/fm.behavior';
import { FMErrors } from './errors';
import {
  getSessionUser,
  UnauthorizedError,
  type SessionUser,
} from '@/server/middleware/withAuthRbac';

type PermissionOptions = {
  module?: ModuleKey;
  submodule?: SubmoduleKey;
  action?: Action;
};

type PermissionSuccess = SessionUser & {
  fmRole: Role;
  plan: Plan;
  userId?: string;
};

const ROLE_ALIAS_MAP: Record<string, Role> = {
  SUPER_ADMIN: Role.SUPER_ADMIN,
  CORPORATE_ADMIN: Role.CORPORATE_ADMIN,
  ADMIN: Role.CORPORATE_ADMIN,
  MANAGER: Role.MANAGEMENT,
  FM_MANAGER: Role.MANAGEMENT,
  PROPERTY_MANAGER: Role.MANAGEMENT,
  FINANCE: Role.FINANCE,
  HR: Role.HR,
  PROCUREMENT: Role.MANAGEMENT,
  EMPLOYEE: Role.EMPLOYEE,
  DISPATCHER: Role.EMPLOYEE,
  TECHNICIAN: Role.TECHNICIAN,
  VENDOR: Role.VENDOR,
  TENANT: Role.TENANT,
  OWNER: Role.PROPERTY_OWNER,
  OWNER_DEPUTY: Role.OWNER_DEPUTY,
  PROPERTY_OWNER: Role.PROPERTY_OWNER,
  CUSTOMER: Role.TENANT,
  SUPPORT: Role.EMPLOYEE,
  AUDITOR: Role.MANAGEMENT,
  VIEWER: Role.GUEST,
};

const PLAN_ALIAS_MAP: Record<string, Plan> = {
  STARTER: Plan.STARTER,
  BASIC: Plan.STARTER,
  STANDARD: Plan.STANDARD,
  PROFESSIONAL: Plan.PRO,
  PRO: Plan.PRO,
  PREMIUM: Plan.PRO,
  ENTERPRISE: Plan.ENTERPRISE,
  ENTERPRISE_PLUS: Plan.ENTERPRISE,
  ENTERPRISE_GROWTH: Plan.ENTERPRISE,
};

const DEFAULT_PLAN = Plan.STANDARD;

const normalizeRole = (role?: string | null): Role | null => {
  if (!role) return null;
  const key = role.toUpperCase();
  return ROLE_ALIAS_MAP[key] ?? (Role as Record<string, Role>)[key] ?? null;
};

const normalizePlan = (plan?: string | null): Plan => {
  if (!plan) return DEFAULT_PLAN;
  const key = plan.toUpperCase().replace(/[\s-]+/g, '_');
  return PLAN_ALIAS_MAP[key] ?? (Plan as Record<string, Plan>)[key] ?? DEFAULT_PLAN;
};

const hasModuleAccess = (role: Role, module?: ModuleKey): boolean => {
  if (!module) return true;
  return Boolean(ROLE_MODULE_ACCESS[role]?.[module]);
};

const hasSubmoduleAccess = (
  role: Role,
  plan: Plan,
  submodule?: SubmoduleKey
): boolean => {
  if (!submodule) return true;
  const planGate = PLAN_GATES[plan]?.[submodule];
  if (!planGate) return false;
  return Boolean(ROLE_ACTIONS[role]?.[submodule]);
};

const hasActionAccess = (
  role: Role,
  submodule: SubmoduleKey,
  action?: Action
): boolean => {
  if (!action) return true;
  const actions = ROLE_ACTIONS[role]?.[submodule];
  return actions ? actions.includes(action) : false;
};

export async function requireFmPermission(
  req: NextRequest,
  options: PermissionOptions
): Promise<PermissionSuccess | NextResponse> {
  try {
    const sessionUser = await getSessionUser(req);
    const fmRole = normalizeRole(sessionUser.role);

    if (!fmRole) {
      return FMErrors.forbidden('Role is not authorized for FM module');
    }

    const plan = normalizePlan(sessionUser.subscriptionPlan);

    if (!sessionUser.isSuperAdmin) {
      if (!hasModuleAccess(fmRole, options.module)) {
        return FMErrors.forbidden('Module access denied');
      }

      if (!hasSubmoduleAccess(fmRole, plan, options.submodule)) {
        return FMErrors.forbidden('Submodule not enabled for this role/plan');
      }

      if (
        options.submodule &&
        !hasActionAccess(fmRole, options.submodule, options.action)
      ) {
        return FMErrors.forbidden('Insufficient permissions for requested action');
      }
    }

    return {
      ...sessionUser,
      fmRole,
      plan,
      userId: sessionUser.id,
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return FMErrors.unauthorized();
    }
    return FMErrors.internalError();
  }
}

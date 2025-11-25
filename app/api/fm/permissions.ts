import { NextRequest, NextResponse } from "next/server";
import {
  ROLE_MODULE_ACCESS,
  ROLE_ACTIONS,
  PLAN_GATES,
  Role,
  ModuleKey,
  SubmoduleKey,
  Action,
  Plan,
} from "@/domain/fm/fm.behavior";
import { FMErrors } from "./errors";
import {
  getSessionUser,
  UnauthorizedError,
  type SessionUser,
} from "@/server/middleware/withAuthRbac";
import { fmErrorContext } from "./errors";

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
  // STRICT v4 Canonical Roles
  SUPER_ADMIN: Role.SUPER_ADMIN,
  ADMIN: Role.ADMIN,
  CORPORATE_OWNER: Role.CORPORATE_OWNER,
  TEAM_MEMBER: Role.TEAM_MEMBER,
  TECHNICIAN: Role.TECHNICIAN,
  PROPERTY_MANAGER: Role.PROPERTY_MANAGER,
  TENANT: Role.TENANT,
  VENDOR: Role.VENDOR,
  GUEST: Role.GUEST,
  
  // Legacy aliases (backward compatibility)
  CORPORATE_ADMIN: Role.ADMIN,
  TENANT_ADMIN: Role.ADMIN,
  CLIENT_ADMIN: Role.ADMIN,
  MANAGEMENT: Role.TEAM_MEMBER,
  MANAGER: Role.TEAM_MEMBER,
  FM_MANAGER: Role.PROPERTY_MANAGER,
  FINANCE: Role.TEAM_MEMBER, // Finance Officer = Team Member with Finance module
  HR: Role.TEAM_MEMBER, // HR Officer = Team Member with HR module
  PROCUREMENT: Role.TEAM_MEMBER,
  EMPLOYEE: Role.TEAM_MEMBER,
  DISPATCHER: Role.TEAM_MEMBER,
  CORPORATE_STAFF: Role.TEAM_MEMBER,
  FIXZIT_EMPLOYEE: Role.TEAM_MEMBER,
  OWNER: Role.CORPORATE_OWNER,
  PROPERTY_OWNER: Role.CORPORATE_OWNER,
  INDIVIDUAL_PROPERTY_OWNER: Role.CORPORATE_OWNER,
  OWNER_DEPUTY: Role.PROPERTY_MANAGER,
  DEPUTY: Role.PROPERTY_MANAGER,
  CUSTOMER: Role.TENANT,
  RESIDENT: Role.TENANT,
  OCCUPANT: Role.TENANT,
  END_USER: Role.TENANT,
  SUPPORT: Role.TEAM_MEMBER,
  AUDITOR: Role.TEAM_MEMBER,
  VIEWER: Role.GUEST,
  FIELD_ENGINEER: Role.TECHNICIAN,
  INTERNAL_TECHNICIAN: Role.TECHNICIAN,
  CONTRACTOR_TECHNICIAN: Role.TECHNICIAN,
  MARKETPLACE_PARTNER: Role.VENDOR,
  SERVICE_PROVIDER: Role.VENDOR,
  SUPPLIER: Role.VENDOR,
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
  const key = plan.toUpperCase().replace(/[\s-]+/g, "_");
  return (
    PLAN_ALIAS_MAP[key] ?? (Plan as Record<string, Plan>)[key] ?? DEFAULT_PLAN
  );
};

const hasModuleAccess = (role: Role, module?: ModuleKey): boolean => {
  if (!module) return true;
  return Boolean(ROLE_MODULE_ACCESS[role]?.[module]);
};

const hasSubmoduleAccess = (
  role: Role,
  plan: Plan,
  submodule?: SubmoduleKey,
): boolean => {
  if (!submodule) return true;
  const planGate = PLAN_GATES[plan]?.[submodule];
  if (!planGate) return false;
  return Boolean(ROLE_ACTIONS[role]?.[submodule]);
};

const hasActionAccess = (
  role: Role,
  submodule: SubmoduleKey,
  action?: Action,
): boolean => {
  if (!action) return true;
  const actions = ROLE_ACTIONS[role]?.[submodule];
  return actions ? actions.includes(action) : false;
};

export async function requireFmPermission(
  req: NextRequest,
  options: PermissionOptions,
): Promise<PermissionSuccess | NextResponse> {
  try {
    const errorContext = fmErrorContext(req);
    const sessionUser = await getSessionUser(req);
    const fmRole = normalizeRole(sessionUser.role);

    if (!fmRole) {
      return FMErrors.forbidden(
        "Role is not authorized for FM module",
        errorContext,
      );
    }

    const plan = normalizePlan(sessionUser.subscriptionPlan);

    if (!sessionUser.isSuperAdmin) {
      if (!hasModuleAccess(fmRole, options.module)) {
        return FMErrors.forbidden("Module access denied", errorContext);
      }

      if (!hasSubmoduleAccess(fmRole, plan, options.submodule)) {
        return FMErrors.forbidden(
          "Submodule not enabled for this role/plan",
          errorContext,
        );
      }

      if (
        options.submodule &&
        !hasActionAccess(fmRole, options.submodule, options.action)
      ) {
        return FMErrors.forbidden(
          "Insufficient permissions for requested action",
          errorContext,
        );
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
      return FMErrors.unauthorized(
        "Authentication required",
        fmErrorContext(req),
      );
    }
    return FMErrors.internalError("Internal server error", fmErrorContext(req));
  }
}

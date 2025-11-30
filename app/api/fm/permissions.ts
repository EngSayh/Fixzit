import { NextRequest, NextResponse } from "next/server";
// RBAC-DRIFT-FIX: Import from fm.types.ts (complete RBAC definitions)
// instead of fm.behavior.ts (truncated, WO/Property only)
import {
  ROLE_ACTIONS,
  PLAN_GATES,
  Role,
  ModuleKey,
  SubmoduleKey,
  Action,
  Plan,
  SubRole,
  normalizeRole,
  normalizeSubRole,
  inferSubRoleFromRole,
  computeAllowedModules,
} from "@/domain/fm/fm.types";
import { FMErrors } from "./errors";
import {
  getSessionUser,
  UnauthorizedError,
  type SessionUser,
} from "@/server/middleware/withAuthRbac";
import { fmErrorContext } from "./errors";
import { connectDb } from "@/lib/mongo";
import { Organization } from "@/server/models/Organization";

type PermissionOptions = {
  module?: ModuleKey;
  submodule?: SubmoduleKey;
  action?: Action;
};

type PermissionSuccess = SessionUser & {
  fmRole: Role;
  fmSubRole?: SubRole;
  plan: Plan;
  userId?: string;
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

// SEC-003 FIX: Use STARTER as default (least privilege principle)
// Previously Plan.STANDARD granted features the user may not have paid for
const DEFAULT_PLAN = Plan.STARTER;

const normalizePlan = (plan?: string | null): Plan => {
  if (!plan) return DEFAULT_PLAN;
  const key = plan.toUpperCase().replace(/[\s-]+/g, "_");
  return (
    PLAN_ALIAS_MAP[key] ?? (Plan as Record<string, Plan>)[key] ?? DEFAULT_PLAN
  );
};

const resolveOrgContext = async (
  orgId: string,
  userId?: string | null,
): Promise<{ plan: Plan; isOrgMember: boolean }> => {
  try {
    await connectDb();
    const org = await Organization.findOne({ orgId });
    if (!org) {
      return { plan: DEFAULT_PLAN, isOrgMember: false };
    }

    const subscriptionPlan =
      org.subscription?.plan ?? (org as { plan?: string }).plan ?? undefined;
    const plan = normalizePlan(subscriptionPlan);

    const isOrgMember =
      !!userId &&
      Array.isArray(org.members) &&
      org.members.some(
        (member) =>
          member &&
          typeof member === "object" &&
          typeof member.userId === "string" &&
          member.userId === userId,
      );

    return { plan, isOrgMember };
  } catch (_error) {
    return { plan: DEFAULT_PLAN, isOrgMember: false };
  }
};

const hasModuleAccess = (role: Role, module?: ModuleKey, subRole?: SubRole): boolean => {
  if (!module) return true;
  
  // PARITY: Use computeAllowedModules for complete sub-role handling
  // This handles Finance, HR, Support, Ops sub-roles correctly
  const allowedModules = computeAllowedModules(role, subRole);
  return allowedModules.includes(module);
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
    const rawRole = sessionUser.role;
    const fmSubRole =
      normalizeSubRole((sessionUser as { subRole?: string | null }).subRole) ??
      inferSubRoleFromRole(rawRole);
    const fmRole = normalizeRole(rawRole);

    // MT-ORG GUARD: Require tenant/org context
    if (!sessionUser.orgId || String(sessionUser.orgId).trim() === "") {
      return FMErrors.unauthorized(
        "Organization context is required for FM permissions",
        errorContext,
      );
    }

    if (!fmRole) {
      return FMErrors.forbidden(
        "Role is not authorized for FM module",
        errorContext,
      );
    }

    const plan = normalizePlan(sessionUser.subscriptionPlan);
    const { plan: orgPlan, isOrgMember } = await resolveOrgContext(
      String(sessionUser.orgId),
      sessionUser.id ? String(sessionUser.id) : undefined,
    );
    const effectivePlan = orgPlan ?? plan;

    if (!sessionUser.isSuperAdmin) {
      if (!isOrgMember) {
        return FMErrors.forbidden(
          "User is not a member of this organization",
          errorContext,
        );
      }

      // SEC-001 FIX: Pass subRole to hasModuleAccess for TEAM_MEMBER sub-role enforcement
      if (!hasModuleAccess(fmRole, options.module, fmSubRole)) {
        return FMErrors.forbidden("Module access denied", errorContext);
      }

      if (!hasSubmoduleAccess(fmRole, effectivePlan, options.submodule)) {
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
      fmSubRole: fmSubRole ?? undefined,
      plan: effectivePlan,
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

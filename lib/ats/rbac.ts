import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import type { IOrganization } from "@/server/models/Organization";
import { getServerTranslation } from "@/lib/i18n/server";
import {
  ATSRole,
  ATSPermission,
  hasAnyPermission,
  hasPermission,
  mapUserRoleToATSRole,
} from "@/lib/ats/permissions";

export type AtsModuleAccess = {
  enabled: boolean;
  jobPostLimit: number;
  seats: number;
  seatUsage: number;
};

const DEFAULT_ATS_MODULE: AtsModuleAccess = {
  enabled: false,
  jobPostLimit: 0,
  seats: 0,
  seatUsage: 0,
};

const ATS_UPGRADE_PATH = "/billing/upgrade?feature=ats";
const ATS_SEAT_USER_ROLES = [
  "HR",
  "CORPORATE_ADMIN",
  "ADMIN",
  "FM_MANAGER",
  "PROPERTY_MANAGER",
];
const ATS_SEAT_PROFESSIONAL_ROLES = [
  "HR Manager",
  "Recruiter",
  "Hiring Manager",
  "Corporate Admin",
  "Talent Acquisition Lead",
];
const ATS_SEAT_REQUIRED_ROLES: ATSRole[] = [
  "Corporate Admin",
  "HR Manager",
  "Recruiter",
  "Hiring Manager",
];

/**
 * ATS RBAC Middleware
 *
 * Usage in API routes:
 * ```typescript
 * const authResult = await atsRBAC(req, ['applications:read']);
 * if (!authResult.authorized) {
 *   return authResult.response;
 * }
 * const { userId, orgId, role } = authResult;
 * ```
 */
export async function atsRBAC(
  req: NextRequest,
  requiredPermissions: ATSPermission[],
): Promise<
  | {
      authorized: true;
      userId: string;
      orgId: string;
      role: ATSRole;
      isSuperAdmin: boolean;
      atsModule: AtsModuleAccess;
    }
  | { authorized: false; response: NextResponse }
> {
  // Get session
  const session = await auth();

  if (!session?.user) {
    const t = await getServerTranslation(req);
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: t("ats.errors.authenticationRequired") },
        { status: 401 },
      ),
    };
  }

  const userId = session.user.id;
  const role = mapUserRoleToATSRole(session.user.role);
  const isSuperAdmin = role === "Super Admin";

  // Get orgId from session (with impersonation support for Super Admin)
  let orgId = session.user.orgId;

  // Super Admin can impersonate tenants via X-Tenant-ID header
  if (isSuperAdmin && hasPermission(role, "tenant:impersonate")) {
    const impersonateOrgId = req.headers.get("X-Tenant-ID");
    if (impersonateOrgId) {
      orgId = impersonateOrgId;
    }
  }

  // Fallback to platform default
  if (!orgId) {
    orgId = process.env.NEXT_PUBLIC_ORG_ID || "fixzit-platform";
  }

  // Check if user has any of the required permissions
  const authorized = hasAnyPermission(role, requiredPermissions);

  if (!authorized) {
    const t = await getServerTranslation(req);
    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          error: t("ats.errors.insufficientPermissions"),
          required: requiredPermissions,
          userRole: role,
        },
        { status: 403 },
      ),
    };
  }

  const { module: atsModule, errorResponse } = await ensureAtsModuleAccess(
    req,
    orgId,
    role,
    isSuperAdmin,
  );
  if (errorResponse) {
    return { authorized: false, response: errorResponse };
  }

  return {
    authorized: true,
    userId,
    orgId,
    role,
    isSuperAdmin,
    atsModule,
  };
}

async function ensureAtsModuleAccess(
  req: NextRequest,
  orgId: string,
  role: ATSRole,
  isSuperAdmin: boolean,
): Promise<{ module: AtsModuleAccess; errorResponse?: NextResponse }> {
  if (isSuperAdmin) {
    return {
      module: {
        enabled: true,
        jobPostLimit: Number.MAX_SAFE_INTEGER,
        seats: Number.MAX_SAFE_INTEGER,
        seatUsage: 0,
      },
    };
  }

  const { Organization } = await import("@/server/models/Organization");
  const organization = await Organization.findOne(
    { orgId },
    { modules: 1 },
  ).lean<Pick<IOrganization, "modules"> | null>();
  const config = organization?.modules?.ats;

  if (!config?.enabled) {
    const t = await getServerTranslation(req);
    return {
      module: DEFAULT_ATS_MODULE,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: t("ats.errors.moduleDisabled"),
          feature: "ats",
          upgradeUrl: ATS_UPGRADE_PATH,
        },
        { status: 402 },
      ),
    };
  }

  const atsModule: AtsModuleAccess = {
    enabled: true,
    jobPostLimit:
      typeof config.jobPostLimit === "number" && config.jobPostLimit > 0
        ? config.jobPostLimit
        : Number.MAX_SAFE_INTEGER,
    seats:
      typeof config.seats === "number" && config.seats > 0
        ? config.seats
        : Number.MAX_SAFE_INTEGER,
    seatUsage: 0,
  };

  if (
    atsModule.seats !== Number.MAX_SAFE_INTEGER &&
    ATS_SEAT_REQUIRED_ROLES.includes(role)
  ) {
    const usage = await countAtsSeatUsage(orgId);
    atsModule.seatUsage = usage;
    if (usage > atsModule.seats) {
      const t = await getServerTranslation(req);
      return {
        module: atsModule,
        errorResponse: NextResponse.json(
          {
            success: false,
            error: t("ats.errors.seatLimitExceeded"),
            feature: "ats",
            upgradeUrl: ATS_UPGRADE_PATH,
            seats: {
              limit: atsModule.seats,
              usage,
            },
          },
          { status: 402 },
        ),
      };
    }
  }

  return { module: atsModule };
}

async function countAtsSeatUsage(orgId: string): Promise<number> {
  const { User } = await import("@/server/models/User");
  return User.countDocuments({
    orgId,
    status: { $ne: "INACTIVE" },
    $or: [
      { role: { $in: ATS_SEAT_USER_ROLES } },
      { "professional.role": { $in: ATS_SEAT_PROFESSIONAL_ROLES } },
    ],
  });
}

/**
 * Resource ownership check
 *
 * Usage:
 * ```typescript
 * const application = await Application.findById(id);
 * if (!canAccessResource(orgId, application.orgId, isSuperAdmin)) {
 *   return NextResponse.json({ error: 'Not found' }, { status: 404 });
 * }
 * ```
 */
export function canAccessResource(
  userOrgId: string,
  resourceOrgId: string,
  isSuperAdmin: boolean,
): boolean {
  // Super Admin can access all resources
  if (isSuperAdmin) return true;

  // Regular users can only access resources in their org
  return userOrgId === resourceOrgId;
}

/**
 * Stage transition guard (state machine)
 *
 * Prevents illegal stage transitions like "applied" → "hired"
 */
export const ALLOWED_STAGE_TRANSITIONS: Record<string, string[]> = {
  applied: ["screening", "rejected", "withdrawn"],
  screening: ["interview", "rejected", "withdrawn"],
  interview: ["offer", "rejected", "withdrawn"],
  offer: ["hired", "rejected", "withdrawn"],
  hired: ["archived"],
  rejected: ["archived"],
  withdrawn: ["archived"],
  archived: [],
};

export function isValidStageTransition(
  currentStage: string,
  newStage: string,
): boolean {
  const allowedNext = ALLOWED_STAGE_TRANSITIONS[currentStage] || [];
  return allowedNext.includes(newStage);
}

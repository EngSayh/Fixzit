import { NextRequest, NextResponse } from "next/server";
import { can } from "../rbac/workOrdersPolicy";
import type { Ability as WorkOrderAbility } from "../rbac/workOrdersPolicy";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { verifyToken } from "@/lib/auth";
import { ALL_ROLES, type UserRoleType } from "@/types/user";
import {
  Role as CanonicalRole,
  SubRole,
  normalizeRole as normalizeFmRole,
  inferSubRoleFromRole,
} from "@/domain/fm/fm.behavior";

export class UnauthorizedError extends Error {
  constructor(message: string = "Unauthenticated") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export type SessionUser = {
  id: string;
  role: UserRoleType;
  subRole?: string | null;
  orgId: string;
  tenantId: string;
  units?: string[];
  vendorId?: string;
  assignedProperties?: string[];
  email?: string;
  name?: string;
  subscriptionPlan?: string | null;
  isSuperAdmin?: boolean;
  permissions?: string[];
  roles?: string[];
  realOrgId?: string;
  impersonatedOrgId?: string | null;
};

const WORK_ORDER_ROLES: CanonicalRole[] = [
  CanonicalRole.SUPER_ADMIN,
  CanonicalRole.ADMIN,
  CanonicalRole.CORPORATE_OWNER,
  CanonicalRole.PROPERTY_MANAGER,
  CanonicalRole.TEAM_MEMBER,
  CanonicalRole.TECHNICIAN,
  CanonicalRole.VENDOR,
  CanonicalRole.TENANT,
  CanonicalRole.GUEST,
];

const canonicalToWorkOrderRole = (
  role: CanonicalRole | null,
  subRole?: SubRole,
): CanonicalRole | null => {
  if (!role) return null;
  switch (role) {
    case CanonicalRole.SUPER_ADMIN:
      return CanonicalRole.SUPER_ADMIN;
    case CanonicalRole.ADMIN:
      return CanonicalRole.ADMIN;
    case CanonicalRole.CORPORATE_OWNER:
      return CanonicalRole.CORPORATE_OWNER;
    case CanonicalRole.PROPERTY_MANAGER:
      return CanonicalRole.PROPERTY_MANAGER;
    case CanonicalRole.TECHNICIAN:
      return CanonicalRole.TECHNICIAN;
    case CanonicalRole.TENANT:
      return CanonicalRole.TENANT;
    case CanonicalRole.VENDOR:
      return CanonicalRole.VENDOR;
    case CanonicalRole.TEAM_MEMBER: {
      if (subRole === SubRole.FINANCE_OFFICER) return CanonicalRole.TEAM_MEMBER;
      if (subRole === SubRole.SUPPORT_AGENT) return CanonicalRole.TEAM_MEMBER;
      if (subRole === SubRole.OPERATIONS_MANAGER) return CanonicalRole.TEAM_MEMBER;
      return CanonicalRole.TEAM_MEMBER;
    }
    default:
      return null;
  }
};

const normalizeWorkOrderRole = (role?: UserRoleType): CanonicalRole | null => {
  if (!role) return null;
  const inferredSubRole = inferSubRoleFromRole(role);
  const canonical = normalizeFmRole(role);
  const mapped = canonicalToWorkOrderRole(canonical, inferredSubRole ?? undefined);
  if (mapped && WORK_ORDER_ROLES.includes(mapped)) {
    return mapped;
  }

  const upper = role.toUpperCase() as CanonicalRole;
  return WORK_ORDER_ROLES.includes(upper) ? upper : null;
};

// Expose internals for testing
export const __internals = {
  normalizeWorkOrderRole,
};

const WORK_ORDER_ABILITIES: WorkOrderAbility[] = [
  "VIEW",
  "CREATE",
  "EDIT",
  "ASSIGN",
  "STATUS",
  "VERIFY",
  "CLOSE",
  "DELETE",
  "EXPORT",
  "COMMENT",
];

const assertValidAbility = (ability: WorkOrderAbility) => {
  if (!WORK_ORDER_ABILITIES.includes(ability)) {
    throw new Error(`Invalid ability: ${ability}`);
  }
};

/**
 * Load RBAC data (roles and permissions) from database for a user
 * This runs in Node.js runtime (API routes) where Mongoose is available
 */
async function loadRBACData(
  userId: string,
  orgId: string,
): Promise<{
  isSuperAdmin: boolean;
  permissions: string[];
  roles: string[];
}> {
  if (process.env.ALLOW_OFFLINE_MONGODB === "true") {
    return {
      isSuperAdmin: false,
      permissions: [],
      roles: [],
    };
  }
  try {
    // Dynamic imports to avoid issues in Edge Runtime
    const { User } = await import("@/server/models/User");
    const RoleModel = (await import("@/models/Role")).default;
    const PermissionModel = (await import("@/models/Permission")).default;
    const { default: mongoose } = await import("mongoose");

    // Query user with populated roles
    const user = await User.findOne({
      _id: new mongoose.Types.ObjectId(userId),
      orgId: orgId,
    })
      .select("isSuperAdmin roles")
      .populate({
        path: "roles",
        model: RoleModel,
        select: "slug wildcard permissions",
        populate: {
          path: "permissions",
          model: PermissionModel,
          select: "key",
        },
      })
      .lean();

    if (!user) {
      logger.warn("[RBAC] User not found for RBAC loading", { userId, orgId });
      return {
        isSuperAdmin: false,
        permissions: [],
        roles: [],
      };
    }

    // Super admin check
    const isSuperAdmin = user.isSuperAdmin || false;

    // If super admin, grant all permissions
    if (isSuperAdmin) {
      return {
        isSuperAdmin: true,
        permissions: ["*"], // Wildcard permission
        roles: ["super_admin"],
      };
    }

    // Extract role slugs and permissions
    const roles: string[] = [];
    const permissionsSet = new Set<string>();

    // Type for populated role object
    type PopulatedRole = {
      slug?: string;
      wildcard?: boolean;
      permissions?: Array<{ key?: string }>;
    };

    if (user.roles && Array.isArray(user.roles)) {
      for (const role of user.roles) {
        if (role && typeof role === "object") {
          const populatedRole = role as unknown as PopulatedRole;

          // Add role slug
          if (populatedRole.slug) {
            roles.push(populatedRole.slug);
          }

          // Check if role has wildcard
          if (populatedRole.wildcard) {
            permissionsSet.add("*");
            continue; // Wildcard role grants all permissions
          }

          // Add permissions from role
          if (
            populatedRole.permissions &&
            Array.isArray(populatedRole.permissions)
          ) {
            for (const perm of populatedRole.permissions) {
              if (perm && typeof perm === "object" && perm.key) {
                permissionsSet.add(perm.key);
              }
            }
          }
        }
      }
    }

    return {
      isSuperAdmin,
      permissions: Array.from(permissionsSet),
      roles,
    };
  } catch (error) {
    logger.error("[RBAC] Failed to load RBAC data", { error, userId, orgId });
    // Return empty RBAC data on error (safe fallback)
    return {
      isSuperAdmin: false,
      permissions: [],
      roles: [],
    };
  }
}

export async function getSessionUser(req: NextRequest): Promise<SessionUser> {
  let userId: string | undefined;
  let orgId: string | undefined;
  let role: UserRoleType | undefined;
  let realOrgId: string | undefined;
  let impersonatedOrgId: string | null = null;
  let sessionIsSuperAdmin = false;
  let email: string | undefined;
  let name: string | undefined;
  let subscriptionPlan: string | null | undefined;

  // Try NextAuth session first (proper way)
  try {
    const session = await auth();

    if (session?.user?.id) {
      userId = session.user.id;
      // ORGID-FIX: Use undefined (not empty string) for missing orgId
      const sessionOrgId = session.user.orgId ? String(session.user.orgId).trim() : undefined;
      realOrgId = sessionOrgId || undefined;
      sessionIsSuperAdmin = Boolean(
        (session.user as { isSuperAdmin?: boolean }).isSuperAdmin,
      );
      const sessionEmail =
        typeof session.user.email === "string" ? session.user.email : undefined;
      const sessionName =
        typeof session.user.name === "string" ? session.user.name : undefined;
      const sessionPlan = (session.user as { subscriptionPlan?: string | null })
        .subscriptionPlan;
      email = sessionEmail ?? email;
      name = sessionName ?? name;
      if (sessionPlan !== undefined) {
        subscriptionPlan = sessionPlan;
      }
      const supportOrgOverride = sessionIsSuperAdmin
        ? (req.cookies.get("support_org_id")?.value ?? undefined)
        : undefined;
      if (supportOrgOverride) {
        orgId = supportOrgOverride;
        impersonatedOrgId = supportOrgOverride;
      } else {
        // ORGID-FIX: Use undefined (not empty string) for missing orgId
        // Empty string would bypass tenant isolation checks
        orgId = sessionOrgId || undefined;  // ✅ undefined (not "")
      }

      // Validate role before casting
      const roleValue = session.user.role;

      if (!roleValue || !ALL_ROLES.includes(roleValue as UserRoleType)) {
        logger.error("Invalid role in NextAuth session", {
          role: roleValue,
          userId: session.user.id,
        });
        throw new UnauthorizedError("Unauthenticated");
      }

      role = roleValue as UserRoleType;
    }
  } catch (e) {
    logger.error("Failed to get NextAuth session", { error: e });
  }

  // Inspect middleware-provided x-user header to capture impersonation context
  const xUserHeader = req.headers.get("x-user");
  if (xUserHeader) {
    try {
      const parsed = JSON.parse(xUserHeader);
      const tenantValue = parsed.orgId || parsed.tenantId;
      const roleValue = parsed.role;
      if (tenantValue && !orgId) {
        orgId = tenantValue;
      }
      if (parsed.id && !userId) {
        userId = parsed.id;
      }
      if (roleValue && ALL_ROLES.includes(roleValue as UserRoleType) && !role) {
        role = roleValue as UserRoleType;
      } else if (roleValue && !ALL_ROLES.includes(roleValue as UserRoleType)) {
        logger.warn("Invalid role in x-user header", { role: roleValue });
      }
      if (!realOrgId && (parsed.realOrgId || tenantValue)) {
        realOrgId = parsed.realOrgId || tenantValue;
      }
      if (!impersonatedOrgId && parsed.impersonatedOrgId) {
        impersonatedOrgId = parsed.impersonatedOrgId;
      }
      if (parsed.isSuperAdmin) {
        sessionIsSuperAdmin = true;
      }
      if (!email && typeof parsed.email === "string") {
        email = parsed.email;
      }
      if (!name && typeof parsed.name === "string") {
        name = parsed.name;
      }
    } catch (e) {
      logger.error("Failed to parse x-user header", { error: e });
    }
  }

  // Legacy: Check for old fixzit_auth cookie or Authorization header
  if (!userId) {
    const cookieToken = req.cookies.get("fixzit_auth")?.value;
    const headerToken = req.headers
      .get("Authorization")
      ?.replace("Bearer ", "");
    const token = cookieToken || headerToken;

    if (token) {
      try {
        const payload = await verifyToken(token);

        if (payload?.id) {
          const tenantValue = payload.orgId || payload.tenantId;

          // Validate role before casting
          const roleValue = payload.role;

          if (
            !roleValue ||
            !ALL_ROLES.includes(String(roleValue) as UserRoleType)
          ) {
            logger.warn("Invalid role in legacy token", {
              role: roleValue,
              userId: payload.id,
            });
            throw new Error("Invalid role in token");
          }

          if (tenantValue) {
            userId = payload.id;
            orgId = tenantValue;
            role = roleValue as UserRoleType;
          }
          if (!email && typeof payload.email === "string") {
            email = payload.email;
          }
          if (!name && typeof payload.name === "string") {
            name = payload.name;
          }
          const payloadWithPlan = payload as {
            subscriptionPlan?: string | null;
          };
          if (
            subscriptionPlan === undefined &&
            typeof payloadWithPlan.subscriptionPlan === "string"
          ) {
            subscriptionPlan = payloadWithPlan.subscriptionPlan;
          }
        }
      } catch (error) {
        logger.error("Legacy token verification failed", { error });
        // Continue to unauthenticated response
      }
    }
  }

  // If no auth found, throw error
  if (!userId || !orgId || !role) {
    throw new UnauthorizedError("Unauthenticated");
  }

  const rbacOrgId = realOrgId || orgId;
  const effectiveRealOrgId = realOrgId ?? orgId;

  // Load RBAC data from database
  const rbacData = await loadRBACData(userId, rbacOrgId);
  const isSuperAdmin = rbacData.isSuperAdmin || sessionIsSuperAdmin;
  const permissions = isSuperAdmin ? ["*"] : rbacData.permissions;
  const roles = isSuperAdmin
    ? Array.from(new Set([...(rbacData.roles || []), "super_admin"]))
    : rbacData.roles;

  return {
    id: userId,
    role: role,
    orgId: orgId,
    tenantId: orgId,
    email,
    name,
    subscriptionPlan: subscriptionPlan ?? null,
    isSuperAdmin,
    permissions,
    roles,
    realOrgId: effectiveRealOrgId,
    impersonatedOrgId,
  };
}

export function requireAbility(ability: WorkOrderAbility) {
  assertValidAbility(ability);
  return async (req: NextRequest) => {
    try {
      const user = await getSessionUser(req);
      const normalizedRole = normalizeWorkOrderRole(user.role);
      if (!normalizedRole || !can(normalizedRole, ability)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return user;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedError) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      if (errorMessage === "Invalid or expired token") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.json(
        { error: "Authentication error" },
        { status: 500 },
      );
    }
  };
}

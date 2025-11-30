/**
 * FM RBAC Middleware
 * Enforces role-based access control for Facility Management endpoints
 */

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import {
  can,
  Role,
  SubmoduleKey,
  Action,
  Plan,
  SubRole,
  normalizeRole,
  normalizeSubRole,
  inferSubRoleFromRole,
} from "@/domain/fm/fm.behavior";
import { connectDb } from "@/lib/mongo";
import { Organization } from "@/server/models/Organization";

export interface FMAuthContext {
  userId: string;
  role: Role;
  subRole?: SubRole;
  orgId: string;
  propertyIds?: string[];
  user: {
    id: string;
    email: string;
    role?: string;
    subRole?: string | null;
    orgId?: string;
    propertyIds?: string[];
  };
}

/**
 * Extract FM auth context from JWT token
 */
export async function getFMAuthContext(
  _req: NextRequest,
): Promise<FMAuthContext | null> {
  try {
    // Get token from cookie or header
    const cookieToken = _req.cookies.get("fixzit_auth")?.value;
    const headerToken = _req.headers
      .get("Authorization")
      ?.replace("Bearer ", "");
    const token = cookieToken || headerToken;

    if (!token) {
      return null;
    }

    const user = await getUserFromToken(token);

    if (!user) {
      return null;
    }

    // Map user role to FM Role enum using canonical STRICT v4.1 normalization
    const rawRole = (user as { role?: string | null }).role;
    const subRole =
      normalizeSubRole((user as { subRole?: string | null }).subRole) ??
      inferSubRoleFromRole(rawRole);
    const role = normalizeRole(rawRole) ?? Role.GUEST;

    // ORGID-FIX: Enforce mandatory orgId for multi-tenant isolation
    const orgId = (user as { orgId?: string }).orgId;
    if (!orgId || orgId.trim() === "") {
      logger.error("[FM Auth] orgId missing - violates multi-tenant isolation", {
        userId: user.id,
        email: user.email,
      });
      return null;
    }

    return {
      userId: user.id || user.email || "",
      role,
      subRole: subRole ?? undefined,
      orgId,  // ✅ Validated above
      propertyIds: (user as { propertyIds?: string[] }).propertyIds || [],
      user: {
        id: user.id || "",
        email: user.email || "",
        role: user.role,
        subRole: (user as { subRole?: string | null }).subRole ?? null,
        orgId,  // ✅ Validated above
        propertyIds: (user as { propertyIds?: string[] }).propertyIds,
      },
    };
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[FM Auth] Context extraction failed:", { error });
    return null;
  }
}

/**
 * Middleware to enforce RBAC on FM endpoints
 * Usage:
 *   export async function GET(req: NextRequest) {
 *     const authCheck = await requireFMAuth(req, SubmoduleKey.WO_CREATE, 'view');
 *     if (authCheck.error) return authCheck.error;
 *     const { ctx } = authCheck;
 *     // ... proceed with authenticated request
 *   }
 */
export async function requireFMAuth(
  req: NextRequest,
  submodule: SubmoduleKey,
  action: Action,
  options?: {
    orgId?: string;
    propertyId?: string;
    ownerId?: string;
  },
): Promise<
  { ctx: FMAuthContext; error: null } | { ctx: null; error: NextResponse }
> {
  // Extract auth context
  const ctx = await getFMAuthContext(req);

  if (!ctx) {
    return {
      ctx: null,
      error: NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 },
      ),
    };
  }

  // ✅ Get actual subscription plan from organization and verify membership
  let plan = Plan.STARTER;
  let isOrgMember = false;

  try {
    await connectDb();
    // Always use ctx.orgId - don't allow callers to query other orgs
    const org = await Organization.findOne({ orgId: ctx.orgId });

    if (org) {
      // Map organization plan to FM Plan enum (with fallback chain)
      const subscriptionPlan = org.subscription?.plan;
      const orgPlan =
        subscriptionPlan || (org as { plan?: string }).plan || "BASIC";
      const planMap: Record<string, Plan> = {
        BASIC: Plan.STARTER,
        STARTER: Plan.STARTER,
        STANDARD: Plan.STANDARD,
        PREMIUM: Plan.PRO,
        PRO: Plan.PRO,
        ENTERPRISE: Plan.ENTERPRISE,
      };
      plan = planMap[orgPlan.toUpperCase()] || Plan.STARTER;

      // Verify org membership: initialize as false and check if user is in member list
      isOrgMember = false;

      // Check if user is in org's member list with proper validation
      if (org.members && Array.isArray(org.members)) {
        for (const member of org.members) {
          // Validate member structure before comparing
          if (
            member &&
            typeof member === "object" &&
            typeof member.userId === "string"
          ) {
            if (member.userId === ctx.userId) {
              isOrgMember = true;
              break;
            }
          } else {
            logger.warn("[FM Auth] Invalid member entry in org.members", {
              orgId: ctx.orgId,
              member,
            });
          }
        }
      }

      logger.debug("[FM Auth] Org lookup successful", {
        orgId: ctx.orgId,
        plan,
        isOrgMember,
        userId: ctx.userId,
      });
    } else {
      logger.warn("[FM Auth] Organization not found", { orgId: ctx.orgId });
    }
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[FM Auth] Subscription lookup failed:", { error });
    // Fall back to STARTER plan and no org membership on error
  }

  // Check RBAC permission
  const allowed = can(submodule, action, {
    role: ctx.role,
    orgId: options?.orgId || ctx.orgId,
    propertyId: options?.propertyId,
    userId: ctx.userId,
    plan,
    isOrgMember,
    subRole: ctx.subRole,
  });

  if (!allowed) {
    return {
      ctx: null,
      error: NextResponse.json(
        {
          error: "Forbidden",
          message: `Role ${ctx.role} lacks permission for ${action} on ${submodule}`,
          required: { submodule, action, role: ctx.role },
        },
        { status: 403 },
      ),
    };
  }

  return { ctx, error: null };
}

/**
 * Check if user has permission (for UI conditional rendering)
 * Note: This is synchronous for UI use. For API routes, use requireFMAuth which does async DB lookups.
 */
export function userCan(
  ctx: FMAuthContext | null,
  submodule: SubmoduleKey,
  action: Action,
  options?: {
    orgId?: string;
    propertyId?: string;
    plan?: Plan;
    isOrgMember?: boolean;
  },
): boolean {
  if (!ctx) return false;

  // Use restrictive defaults: STARTER plan and no org membership unless explicitly provided
  // Callers MUST provide plan and isOrgMember from DB for accurate permission checks
  return can(submodule, action, {
    role: ctx.role,
    orgId: options?.orgId || ctx.orgId,
    propertyId: options?.propertyId,
    userId: ctx.userId,
    plan: options?.plan ?? Plan.STARTER,
    isOrgMember: options?.isOrgMember ?? false,
  });
}

/**
 * Extract property ownership context for ABAC checks
 *
 * NOTE: FMProperty model not yet implemented. When created, it should have:
 * - ownerId: string (User ID of property owner)
 * - orgId: string (Organization ID managing the property)
 * - propertyId: string (Unique property identifier)
 *
 * Example implementation when model exists:
 * ```typescript
 * import { FMProperty } from '@/domain/fm/fm.behavior';
 * const property = await FMProperty.findOne({ propertyId });
 * if (property) {
 *   return { ownerId: property.ownerId, orgId: property.orgId };
 * }
 * ```
 */
export async function getPropertyOwnership(_propertyId: string): Promise<{
  ownerId: string;
  orgId: string;
} | null> {
  try {
    await connectDb();

    // Try to import FMProperty model (may not exist yet)
    const FMPropertyModule = await import("@/domain/fm/fm.behavior").catch(
      () => null,
    );

    if (FMPropertyModule && FMPropertyModule.FMProperty) {
      const property = await FMPropertyModule.FMProperty.findOne({
        propertyId: _propertyId,
      })
        .select("ownerId orgId")
        .lean();

      const propertyDoc = property as
        | { orgId?: unknown; ownerId?: unknown }
        | null;
      if (propertyDoc) {
        // ORGID-FIX: Validate orgId exists before returning
        const orgIdVal =
          (propertyDoc.orgId as { toString?: () => string } | string | null) ||
          null;
        const orgId =
          typeof orgIdVal === "string"
            ? orgIdVal
            : typeof (orgIdVal as { toString?: unknown })?.toString ===
                "function"
              ? (orgIdVal as { toString: () => string }).toString()
              : null;
        if (!orgId || orgId.trim() === "") {
          logger.error("[FM Auth] Property has no orgId - data integrity issue", {
            propertyId: _propertyId,
            ownerId: propertyDoc.ownerId,
          });
          return null;
        }

        logger.debug("[FM Auth] Property ownership found", {
          propertyId: _propertyId,
          ownerId: propertyDoc.ownerId,
          orgId,
        });
        return {
          ownerId:
            typeof propertyDoc.ownerId === "string"
              ? propertyDoc.ownerId
              : typeof (propertyDoc.ownerId as { toString?: unknown })?.toString ===
                  "function"
                ? (propertyDoc.ownerId as { toString: () => string }).toString()
                : "",
          orgId,
        };
      }
    } else {
      // Fallback: Try WorkOrder model which may have propertyId reference
      logger.debug("[FM Auth] FMProperty model not found, checking WorkOrders");
      const FMWorkOrderModule = await import("@/domain/fm/fm.behavior").catch(
        () => null,
      );
      const workOrder = FMWorkOrderModule
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic import requires type assertion
        ? await (FMWorkOrderModule.FMWorkOrder as any)
            .findOne({ propertyId: _propertyId })
            .select("propertyOwnerId orgId")
            .lean()
        : null;

      const workOrderDoc = workOrder as
        | { orgId?: unknown; propertyOwnerId?: unknown }
        | null;
      if (workOrderDoc && workOrderDoc.propertyOwnerId) {
        // ORGID-FIX: Validate orgId exists before returning
        const orgIdVal =
          (workOrderDoc.orgId as { toString?: () => string } | string | null) ||
          null;
        const orgId =
          typeof orgIdVal === "string"
            ? orgIdVal
            : typeof (orgIdVal as { toString?: unknown })?.toString ===
                "function"
              ? (orgIdVal as { toString: () => string }).toString()
              : null;
        if (!orgId || orgId.trim() === "") {
          logger.error("[FM Auth] WorkOrder has no orgId - data integrity issue", {
            propertyId: _propertyId,
            ownerId: workOrderDoc.propertyOwnerId,
          });
          return null;
        }

        const ownerVal = workOrderDoc.propertyOwnerId as
          | { toString?: () => string }
          | string
          | null
          | undefined;
        const ownerIdStr = ownerVal ? (ownerVal as { toString?: () => string }).toString?.() ?? String(ownerVal) : "";

        return {
          ownerId: ownerIdStr,
          orgId,
        };
      }
    }

    logger.warn("[FM Auth] Property ownership not found", {
      propertyId: _propertyId,
    });
    return null;
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[FM Auth] Property ownership query failed:", {
      error,
      propertyId: _propertyId,
    });
    return null;
  }
}

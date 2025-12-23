"use server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import type { AuthSession, ExtendedUser } from "@/types/auth-session";
import {
  setSuperAdminTenantContext,
  setTenantContext,
} from "@/server/plugins/tenantIsolation";

/**
 * @module lib/server-auth-session
 * @description Server-side authentication session helper for Server Components and API routes.
 *
 * Provides session retrieval with RBAC fields (STRICT v4.1) and tenant isolation.
 * Separated from client hooks to avoid bundling server dependencies (ioredis) into client builds.
 *
 * @features
 * - Server-only session access (auth() from @/auth)
 * - RBAC fields (role, subRole, permissions, roles array)
 * - Multi-tenancy (orgId, tenantId)
 * - Seller marketplace support (sellerId)
 * - Super Admin detection (isSuperAdmin flag)
 * - Missing field warnings (role, orgId, tenantId validation)
 *
 * @usage
 * ```typescript
 * import { getServerAuthSession } from '@/lib/server-auth-session';
 * 
 * export async function GET() {
 *   const session = await getServerAuthSession();
 *   if (!session) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 *   
 *   // Tenant-scoped query
 *   const data = await Model.find({ org_id: session.orgId });
 *   return NextResponse.json(data);
 * }
 * ```
 *
 * @compliance
 * STRICT v4.1: All server routes MUST use this for session access.
 */
export async function getServerAuthSession(): Promise<AuthSession | null> {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  const user = session.user as ExtendedUser;

  // Warn if critical auth fields are missing rather than silently defaulting
  if (!user.role) {
    logger.warn(`[Auth] User ${user.id} missing role field`);
  }
  if (!user.orgId && user.role !== "SUPER_ADMIN") {
    logger.warn(`[Auth] User ${user.id} missing orgId (role: ${user.role})`);
  }
  if (!user.tenantId && user.role !== "SUPER_ADMIN") {
    logger.warn(`[Auth] User ${user.id} missing tenantId (role: ${user.role})`);
  }

  if (user.orgId) {
    if (user.isSuperAdmin) {
      setSuperAdminTenantContext(String(user.orgId), user.id);
    } else {
      setTenantContext({ orgId: user.orgId, userId: user.id });
    }
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role || "GUEST",
    orgId: user.orgId || null, // Organization ID for tenant isolation
    tenantId: user.tenantId || null, // Use null instead of empty string to distinguish from missing data
    sellerId: user.sellerId,
    isAuthenticated: true,
    // RBAC fields (STRICT v4.1) - aligned with auth.config.ts JWT/session callbacks
    subRole: user.subRole ?? null,
    permissions: user.permissions ?? [],
    roles: user.roles ?? [],
    isSuperAdmin: Boolean(user.isSuperAdmin),
  };
}

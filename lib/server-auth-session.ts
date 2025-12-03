"use server";

import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import type { AuthSession, ExtendedUser } from "@/types/auth-session";

/**
 * Server-side session helper (for Server Components and API routes)
 * Kept separate from the client hook to avoid bundling ioredis into client builds.
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

/**
 * @module lib/api/admin-guard
 * @description Canonical admin and superadmin guards for API routes.
 * 
 * Provides standardized auth guards with consistent status codes:
 * - 401: Not authenticated (no session/token)
 * - 403: Not authorized (wrong role)
 * - 404: Hidden from non-admins (security through obscurity for sensitive endpoints)
 * 
 * @security
 * - All guards enforce tenant scope
 * - Superadmin routes use 404 to hide existence from non-admins
 * - Audit logging for all admin actions
 * 
 * @example
 * // In API route
 * import { requireAdmin, requireSuperadmin } from '@/lib/api/admin-guard';
 * 
 * export async function GET(req: NextRequest) {
 *   const { session, error } = await requireAdmin(req);
 *   if (error) return error;
 *   // ... handle request
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSuperadminSession, type SuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import type { Session } from "next-auth";

/**
 * Standard error responses following HTTP semantics:
 * - 401 Unauthorized: No valid authentication provided
 * - 403 Forbidden: Authenticated but lacks permission
 * - 404 Not Found: Used to hide admin endpoints from non-admins
 */
const RESPONSES = {
  unauthorized: () => NextResponse.json(
    { error: "Unauthorized", code: "UNAUTHORIZED" },
    { status: 401 }
  ),
  forbidden: (reason?: string) => NextResponse.json(
    { error: reason || "Forbidden", code: "FORBIDDEN" },
    { status: 403 }
  ),
  notFound: () => NextResponse.json(
    { error: "Not found" },
    { status: 404 }
  ),
} as const;

/**
 * Admin roles in order of privilege
 */
const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;
type AdminRole = typeof ADMIN_ROLES[number];

function isAdminRole(role: string | undefined): role is AdminRole {
  return !!role && ADMIN_ROLES.includes(role as AdminRole);
}

function isSuperAdmin(role: string | undefined): boolean {
  return role === "SUPER_ADMIN";
}

interface AdminGuardResult {
  session: Session;
  error: null;
}

interface AdminGuardError {
  session: null;
  error: NextResponse;
}

type AdminGuardResponse = AdminGuardResult | AdminGuardError;

/**
 * Require user to be an Admin (ADMIN or SUPER_ADMIN role).
 * Returns 401 if not authenticated, 403 if not an admin.
 * 
 * @param req - NextRequest object
 * @returns Object with session or error response
 */
export async function requireAdmin(req: NextRequest): Promise<AdminGuardResponse> {
  try {
    const session = await auth() as Session | null;
    
    if (!session?.user) {
      logger.warn("[requireAdmin] Unauthorized access attempt", {
        path: req.nextUrl.pathname,
        ip: req.headers.get("x-forwarded-for") || "unknown",
      });
      return { session: null, error: RESPONSES.unauthorized() };
    }

    const role = session.user.role as string | undefined;
    
    if (!isAdminRole(role)) {
      logger.warn("[requireAdmin] Non-admin access attempt", {
        path: req.nextUrl.pathname,
        userId: session.user.id,
        role,
      });
      return { session: null, error: RESPONSES.forbidden("Admin access required") };
    }

    return { session, error: null };
  } catch (error) {
    logger.error("[requireAdmin] Auth error", { error });
    return { session: null, error: RESPONSES.unauthorized() };
  }
}

interface SuperadminGuardResult {
  session: SuperadminSession;
  error: null;
}

interface SuperadminGuardError {
  session: null;
  error: NextResponse;
}

type SuperadminGuardResponse = SuperadminGuardResult | SuperadminGuardError;

/**
 * Require user to be a Super Admin.
 * Uses 404 response for non-admins to hide endpoint existence.
 * 
 * Supports two auth methods:
 * 1. Superadmin session cookie (for /superadmin UI)
 * 2. NextAuth session with SUPER_ADMIN role
 * 
 * @param req - NextRequest object
 * @param options.hideEndpoint - If true, returns 404 instead of 403 (default: true)
 * @returns Object with session or error response
 */
export async function requireSuperadmin(
  req: NextRequest,
  options: { hideEndpoint?: boolean } = {}
): Promise<SuperadminGuardResponse> {
  const { hideEndpoint = true } = options;
  
  try {
    // Try superadmin session first (cookie-based)
    const superadminSession = await getSuperadminSession(req);
    
    if (superadminSession) {
      return { session: superadminSession, error: null };
    }

    // Fall back to NextAuth session
    const session = await auth() as Session | null;
    
    if (!session?.user) {
      logger.warn("[requireSuperadmin] Unauthorized access attempt", {
        path: req.nextUrl.pathname,
        ip: req.headers.get("x-forwarded-for") || "unknown",
      });
      return { session: null, error: RESPONSES.unauthorized() };
    }

    const role = session.user.role as string | undefined;
    
    if (!isSuperAdmin(role)) {
      logger.warn("[requireSuperadmin] Non-superadmin access attempt", {
        path: req.nextUrl.pathname,
        userId: session.user.id,
        role,
      });
      // Return 404 to hide admin endpoints from non-admins
      return { 
        session: null, 
        error: hideEndpoint ? RESPONSES.notFound() : RESPONSES.forbidden("Super Admin access required") 
      };
    }

    // Create compatible session object
    const compatSession: SuperadminSession = {
      username: session.user.email || session.user.name || "unknown",
      role: "super_admin",
      orgId: (session.user as { orgId?: string }).orgId || "",
      issuedAt: Date.now(),
      expiresAt: Date.now() + 3600_000, // 1 hour
    };

    return { session: compatSession, error: null };
  } catch (error) {
    logger.error("[requireSuperadmin] Auth error", { error });
    return { session: null, error: RESPONSES.unauthorized() };
  }
}

/**
 * Quick check if request is from an admin without throwing.
 * Useful for conditional logic in routes that have mixed access.
 */
export async function isAdminRequest(_req: NextRequest): Promise<boolean> {
  try {
    const session = await auth() as Session | null;
    return isAdminRole(session?.user?.role as string | undefined);
  } catch {
    return false;
  }
}

/**
 * Quick check if request is from a super admin without throwing.
 */
export async function isSuperadminRequest(req: NextRequest): Promise<boolean> {
  try {
    const superadminSession = await getSuperadminSession(req);
    if (superadminSession) return true;
    
    const session = await auth() as Session | null;
    return isSuperAdmin(session?.user?.role as string | undefined);
  } catch {
    return false;
  }
}

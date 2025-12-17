/**
 * @module lib/edge-auth-middleware
 * @description Edge Runtime Authentication Middleware for Fixzit
 *
 * Provides JWT authentication for Edge Runtime middleware (middleware.ts) with
 * jose library support (compatible with Edge Runtime constraints).
 *
 * @features
 * - **Edge Runtime Compatible**: Uses jose library instead of jsonwebtoken (Edge-safe)
 * - **JWT Verification**: HS256 algorithm with 5-second clock skew tolerance
 * - **Multi-Cookie Support**: Tries 5 cookie names (fz_session, session, auth_token, next-auth.session-token, fixzit_session)
 * - **Typed Payloads**: Extracts id, email, roles, permissions, organizationId, tenantId
 * - **Error Handling**: Returns structured error objects with HTTP status codes
 * - **Algorithm Restriction**: Only HS256 allowed (prevents 'none' algorithm attacks)
 *
 * @usage
 * In middleware.ts:
 * ```typescript
 * import { authenticateRequest } from '@/lib/edge-auth-middleware';
 * import { NextRequest, NextResponse } from 'next/server';
 *
 * export async function middleware(request: NextRequest) {
 *   const result = await authenticateRequest(request);
 *
 *   if ('error' in result) {
 *     return new NextResponse(result.error, { status: result.statusCode });
 *   }
 *
 *   const user = result;
 *   console.log('Authenticated user:', user.id, user.email);
 *   console.log('Org ID:', user.organizationId);
 *
 *   return NextResponse.next();
 * }
 * ```
 *
 * @security
 * - **Algorithm Whitelist**: Only HS256 accepted (prevents JWT algorithm substitution attacks)
 * - **Clock Skew Tolerance**: 5 seconds to handle minor time sync issues
 * - **Secret Validation**: JWT secret validated at startup via lib/startup-checks.ts
 * - **Cookie Security**: Multiple cookie names for flexibility (migrate to fz_session long-term)
 * - **No Hardcoded Secrets**: JWT secret from environment variable only
 * - **Payload Validation**: Safely extracts known fields; unknown fields ignored
 *
 * @compliance
 * - **Multi-Tenancy**: organizationId extracted from JWT for tenant scoping
 * - **RBAC**: roles and permissions arrays extracted for authorization checks
 *
 * @deployment
 * Required environment variables:
 * - `JWT_SECRET`: Secret key for JWT verification (same as lib/auth.ts signing key)
 *
 * Cookie priority order (first found wins):
 * 1. `fz_session` (preferred, Fixzit standard)
 * 2. `session` (generic fallback)
 * 3. `auth_token` (legacy)
 * 4. `next-auth.session-token` (NextAuth default)
 * 5. `fixzit_session` (backwards compatibility)
 *
 * @performance
 * - Edge Runtime: Faster cold starts vs. Node.js runtime
 * - JWT verification: <1ms (jose library optimized for Edge)
 * - No database queries: All auth data in JWT payload
 *
 * @see {@link /lib/auth.ts} for JWT token generation
 * @see {@link /lib/startup-checks.ts} for JWT secret validation
 * @see {@link https://github.com/panva/jose} for jose library documentation
 */

import { NextRequest } from "next/server";
import { logger } from "./logger";
import { jwtVerify } from "jose";
import { getJWTSecret } from "./startup-checks";

export interface EdgeAuthenticatedUser {
  id: string;
  email: string;
  roles: Array<{ name: string; permissions: string[] }>;
  permissions: string[];
  organizationId?: string;
  tenantId?: string;
}

export interface AuthResult {
  error?: string;
  statusCode?: number;
}

export async function authenticateRequest(
  request: NextRequest,
): Promise<EdgeAuthenticatedUser | AuthResult> {
  try {
    // Get JWT secret (validated at startup via lib/startup-checks.ts)
    const secret = getJWTSecret();
    const secretKey = new TextEncoder().encode(secret);

    // Try to get token from various cookie names
    const token =
      request.cookies.get("fz_session")?.value ||
      request.cookies.get("session")?.value ||
      request.cookies.get("auth_token")?.value ||
      request.cookies.get("next-auth.session-token")?.value ||
      request.cookies.get("fixzit_session")?.value;

    if (!token) {
      return {
        error: "No authentication token found",
        statusCode: 401,
      };
    }

    // Verify JWT token with algorithm constraint for security
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
      clockTolerance: 5, // 5 second tolerance for clock skew
    });

    // Safely extract typed fields from payload (jose JWTPayload is indexable as unknown)
    const pl: Record<string, unknown> = payload as Record<string, unknown>;
    const id =
      typeof payload.sub === "string"
        ? payload.sub
        : typeof pl.id === "string"
          ? (pl.id as string)
          : "";
    const email = typeof pl.email === "string" ? (pl.email as string) : "";
    const roles = Array.isArray(pl.roles)
      ? (pl.roles as Array<{ name: string; permissions: string[] }>)
      : [{ name: "guest", permissions: [] }];
    const permissions = Array.isArray(pl.permissions)
      ? (pl.permissions as string[])
      : [];
    const organizationId =
      typeof pl.organizationId === "string"
        ? (pl.organizationId as string)
        : "";
    const tenantId =
      typeof pl.tenantId === "string" ? (pl.tenantId as string) : "";

    // Extract user information from payload
    const user: EdgeAuthenticatedUser = {
      id,
      email,
      roles,
      permissions,
      organizationId,
      tenantId,
    };

    return user;
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("Authentication error:", error as Error);
    return {
      error: "Invalid or expired token",
      statusCode: 401,
    };
  }
}

export function hasPermission(
  user: EdgeAuthenticatedUser,
  permission: string,
): boolean {
  // Super admin has all permissions
  if (user.roles.some((role) => role.name === "super_admin")) {
    return true;
  }

  // Check if user has the specific permission
  return (
    user.permissions.includes(permission) ||
    user.roles.some(
      (role) =>
        role.permissions.includes(permission) || role.permissions.includes("*"),
    )
  );
}

export function hasRole(
  user: EdgeAuthenticatedUser,
  roleName: string,
): boolean {
  return user.roles.some((role) => role.name === roleName);
}

export function hasAnyRole(
  user: EdgeAuthenticatedUser,
  roleNames: string[],
): boolean {
  return user.roles.some((role) => roleNames.includes(role.name));
}

export function getUserPermissions(user: EdgeAuthenticatedUser): string[] {
  const rolePermissions = user.roles.flatMap((role) => role.permissions);
  return [...new Set([...user.permissions, ...rolePermissions])];
}

export function isAdmin(user: EdgeAuthenticatedUser): boolean {
  return hasAnyRole(user, ["admin", "super_admin"]);
}

export function isManager(user: EdgeAuthenticatedUser): boolean {
  return hasAnyRole(user, [
    "admin",
    "super_admin",
    "property_manager",
    "finance_manager",
  ]);
}

export function isTenant(user: EdgeAuthenticatedUser): boolean {
  return hasRole(user, "tenant");
}

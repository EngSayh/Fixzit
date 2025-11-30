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

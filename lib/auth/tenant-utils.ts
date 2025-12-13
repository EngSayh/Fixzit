/**
 * @fileoverview Tenant Validation Utilities
 * @description Centralized tenant (org_id) validation to prevent cross-tenant data access
 * @module lib/auth/tenant-utils
 *
 * CRITICAL: These utilities enforce multi-tenancy security.
 * Never use orgId || "fallback" patterns - use these functions instead.
 */

import type { Session } from "next-auth";

/**
 * Custom error for tenant validation failures
 */
export class TenantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantError";
  }
}

/**
 * Session user type with orgId
 */
export interface SessionUser {
  id: string;
  orgId?: string | null;
  role?: string;
  roles?: string[];
  email?: string;
}

/**
 * Extracts and validates orgId from a session object.
 * Throws TenantError if orgId is missing, empty, or invalid.
 *
 * @param session - The NextAuth session object
 * @param context - Optional context for error logging
 * @returns The validated orgId string
 * @throws TenantError if orgId is missing or invalid
 *
 * @example
 * ```typescript
 * const orgId = requireOrgId(session);
 * const data = await Model.find({ orgId });
 * ```
 */
export function requireOrgId(
  session: Session | null | undefined,
  context?: string
): string {
  const orgId = session?.user?.orgId;

  if (!orgId) {
    throw new TenantError(
      `Missing orgId in session${context ? ` (${context})` : ""}`
    );
  }

  if (typeof orgId !== "string") {
    throw new TenantError(
      `Invalid orgId type: expected string, got ${typeof orgId}${context ? ` (${context})` : ""}`
    );
  }

  const trimmed = orgId.trim();
  if (trimmed === "" || trimmed === "null" || trimmed === "undefined") {
    throw new TenantError(
      `Empty or invalid orgId value${context ? ` (${context})` : ""}`
    );
  }

  return trimmed;
}

/**
 * Extracts and validates orgId from a session user object.
 * Throws TenantError if orgId is missing, empty, or invalid.
 *
 * @param user - The session user object
 * @param context - Optional context for error logging
 * @returns The validated orgId string
 * @throws TenantError if orgId is missing or invalid
 */
export function requireOrgIdFromUser(
  user: SessionUser | null | undefined,
  context?: string
): string {
  const orgId = user?.orgId;

  if (!orgId) {
    throw new TenantError(
      `Missing orgId in user${context ? ` (${context})` : ""}`
    );
  }

  if (typeof orgId !== "string") {
    throw new TenantError(
      `Invalid orgId type: expected string, got ${typeof orgId}${context ? ` (${context})` : ""}`
    );
  }

  const trimmed = orgId.trim();
  if (trimmed === "" || trimmed === "null" || trimmed === "undefined") {
    throw new TenantError(
      `Empty or invalid orgId value${context ? ` (${context})` : ""}`
    );
  }

  return trimmed;
}

/**
 * Validates an orgId string without throwing.
 * Returns true if the orgId is valid, false otherwise.
 *
 * @param orgId - The orgId string to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * ```typescript
 * if (!isValidOrgId(orgId)) {
 *   return NextResponse.json({ error: "Invalid tenant" }, { status: 400 });
 * }
 * ```
 */
export function isValidOrgId(orgId: unknown): orgId is string {
  if (!orgId || typeof orgId !== "string") {
    return false;
  }

  const trimmed = orgId.trim();
  return (
    trimmed !== "" &&
    trimmed !== "null" &&
    trimmed !== "undefined" &&
    trimmed !== "unknown" &&
    trimmed !== "anonymous"
  );
}

/**
 * Safely extracts orgId from a session, returning null if invalid.
 * Use this for optional tenant contexts (e.g., public + personalized routes).
 *
 * @param session - The NextAuth session object
 * @returns The orgId string or null if missing/invalid
 *
 * @example
 * ```typescript
 * const orgId = getOrgIdOrNull(session);
 * if (orgId) {
 *   // Personalized query
 * } else {
 *   // Public/anonymous query
 * }
 * ```
 */
export function getOrgIdOrNull(
  session: Session | null | undefined
): string | null {
  const orgId = session?.user?.orgId;
  return isValidOrgId(orgId) ? orgId : null;
}

/**
 * MongoDB ObjectId format validation
 */
const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

/**
 * Validates that an orgId is a valid MongoDB ObjectId format.
 * Some systems may use ObjectId strings for orgId.
 *
 * @param orgId - The orgId to validate
 * @returns true if valid ObjectId format
 */
export function isValidOrgIdObjectId(orgId: unknown): orgId is string {
  return isValidOrgId(orgId) && OBJECT_ID_REGEX.test(orgId);
}

/**
 * Validates that an orgId matches one of the allowed values.
 * Useful for Super Admin contexts where only specific orgs are accessible.
 *
 * @param orgId - The orgId to validate
 * @param allowedOrgIds - Set of allowed orgId values
 * @returns true if orgId is in the allowed set
 */
export function isOrgIdAllowed(
  orgId: unknown,
  allowedOrgIds: Set<string> | string[]
): boolean {
  if (!isValidOrgId(orgId)) {
    return false;
  }
  const allowedSet =
    allowedOrgIds instanceof Set ? allowedOrgIds : new Set(allowedOrgIds);
  return allowedSet.has(orgId);
}

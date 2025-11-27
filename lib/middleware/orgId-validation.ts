import { NextResponse } from "next/server";
import type { Session } from "next-auth";

/**
 * Validates orgId from session for tenant isolation.
 * Extracted to eliminate duplication across admin/API routes.
 *
 * @param orgId - The orgId from session.user.orgId
 * @returns Object with valid flag and sanitized orgId if valid
 *
 * @example
 * const { valid, orgId, errorResponse } = validateOrgId(session.user.orgId);
 * if (!valid) return errorResponse;
 * // Use orgId safely - guaranteed non-empty string
 */
export function validateOrgId(orgId: string | null | undefined): {
  valid: true;
  orgId: string;
  errorResponse?: never;
} | {
  valid: false;
  orgId?: never;
  errorResponse: NextResponse;
} {
  if (!orgId || typeof orgId !== "string" || orgId.trim() === "") {
    return {
      valid: false,
      errorResponse: NextResponse.json(
        { error: "Unauthorized: Invalid organization context" },
        { status: 403 }
      ),
    };
  }

  return { valid: true, orgId: orgId.trim() };
}

/**
 * Extracts and validates orgId from a NextAuth session.
 * Convenience wrapper combining session check and orgId validation.
 *
 * @param session - NextAuth session object
 * @returns Object with valid flag and validated orgId
 *
 * @example
 * const session = await auth();
 * const { valid, orgId, errorResponse } = validateOrgIdFromSession(session);
 * if (!valid) return errorResponse;
 */
export function validateOrgIdFromSession(session: Session | null): {
  valid: true;
  orgId: string;
  errorResponse?: never;
} | {
  valid: false;
  orgId?: never;
  errorResponse: NextResponse;
} {
  if (!session?.user) {
    return {
      valid: false,
      errorResponse: NextResponse.json(
        { error: "Unauthorized: No session" },
        { status: 401 }
      ),
    };
  }

  return validateOrgId(session.user.orgId);
}

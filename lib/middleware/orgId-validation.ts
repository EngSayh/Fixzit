/**
 * @module lib/middleware/orgId-validation
 * @description Organization ID Validation for Multi-Tenant Isolation
 *
 * Provides tenant isolation validation helpers to prevent cross-organization data leaks
 * by enforcing orgId presence and format in NextAuth sessions.
 *
 * @features
 * - **Tenant Isolation**: Validates orgId before database queries
 * - **Type-Safe Validation**: Returns typed union for safe orgId access
 * - **Automatic Error Responses**: Pre-built 403 Forbidden responses for invalid orgId
 * - **Session Integration**: Convenience wrapper for NextAuth session objects
 * - **Duplicate Elimination**: Centralized orgId validation (no copy-paste across routes)
 *
 * @usage
 * Validate orgId from session (preferred):
 * ```typescript
 * import { auth } from '@/auth';
 * import { validateOrgIdFromSession } from '@/lib/middleware/orgId-validation';
 *
 * export async function GET(request: NextRequest) {
 *   const session = await auth();
 *   const { valid, orgId, errorResponse } = validateOrgIdFromSession(session);
 *   if (!valid) return errorResponse; // 403 Forbidden
 *
 *   // orgId is guaranteed non-empty string here
 *   const data = await WorkOrder.find({ org_id: orgId });
 *   return NextResponse.json(data);
 * }
 * ```
 *
 * Validate raw orgId value:
 * ```typescript
 * import { validateOrgId } from '@/lib/middleware/orgId-validation';
 *
 * const { valid, orgId, errorResponse } = validateOrgId(session.user.orgId);
 * if (!valid) return errorResponse; // 403 if null/empty/whitespace
 * ```
 *
 * @security
 * - **Null-Safe**: Rejects null, undefined, empty string, whitespace-only orgId
 * - **Type Guard**: TypeScript discriminated union ensures orgId is string when valid=true
 * - **403 Forbidden**: Returns 403 instead of 401 to prevent enumeration attacks
 * - **Trimmed Values**: Automatically trims orgId to catch whitespace injection
 * - **Session Source**: Always use session.user.orgId (never client headers/query params)
 *
 * @compliance
 * - **Multi-Tenancy**: Core enforcement for ZATCA/HFV compliance (org-scoped e-invoices)
 * - **Data Isolation**: Prevents accidental cross-tenant queries ("Security by Default")
 * - **Audit Trail**: Invalid orgId attempts should be logged in production
 *
 * @deployment
 * No environment variables required.
 *
 * **Best Practices**:
 * 1. **Always validate orgId** before MongoDB/Meilisearch queries
 * 2. **Never trust client-provided orgId** (headers, query params, body)
 * 3. **Use session.user.orgId** as the single source of truth
 * 4. **Log 403 responses** for security monitoring (potential attack attempts)
 * 5. **Index orgId in MongoDB** for query performance (compound indexes recommended)
 *
 * **Error Response Format**:
 * ```json
 * {
 *   "error": "Unauthorized: Invalid organization context"
 * }
 * ```
 * Status: 403 Forbidden
 *
 * @performance
 * - Validation: <1ms (string null-check + trim)
 * - No database queries: Pure validation logic
 * - Type-safe: Zero runtime overhead for discriminated unions
 *
 * @see {@link /lib/auth.ts} for session management
 * @see {@link /server/models/*.ts} for MongoDB models with orgId scoping
 */

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

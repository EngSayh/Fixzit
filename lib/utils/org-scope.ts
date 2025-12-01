import { Types } from "mongoose";

/**
 * Build an org-scoped filter for MongoDB/Mongoose queries.
 *
 * This handles both string and ObjectId representations of orgId,
 * as well as both field naming conventions (orgId and org_id).
 *
 * SECURITY: Always use this helper for tenant-scoped queries to prevent
 * cross-tenant data access.
 *
 * @param id - The document _id to filter on
 * @param orgId - The organization ID for tenant scoping (REQUIRED)
 * @returns A MongoDB filter object with _id and org scope
 *
 * @example
 * ```typescript
 * const filter = buildOrgScopedFilter(paymentId, orgId);
 * const payment = await AqarPayment.findOne(filter);
 * ```
 */
export function buildOrgScopedFilter(
  id: string | Types.ObjectId,
  orgId: string,
): {
  _id: string | Types.ObjectId;
  $or: Array<{ orgId: string } | { org_id: string }>;
} {
  return {
    _id: id,
    $or: [{ orgId }, { org_id: orgId }],
  };
}

/**
 * Build an org-scoped filter without _id constraint.
 *
 * Use this for queries that need org scoping but filter on other fields.
 *
 * @param orgId - The organization ID for tenant scoping (REQUIRED)
 * @returns A MongoDB filter object with org scope only
 *
 * @example
 * ```typescript
 * const orgFilter = buildOrgOnlyFilter(orgId);
 * const payments = await AqarPayment.find({ ...orgFilter, status: 'COMPLETED' });
 * ```
 */
export function buildOrgOnlyFilter(orgId: string): {
  $or: Array<{ orgId: string } | { org_id: string }>;
} {
  return {
    $or: [{ orgId }, { org_id: orgId }],
  };
}

/**
 * Validate that orgId is present and non-empty.
 *
 * SECURITY: Use this at function entry points to enforce tenant isolation.
 * Prefer fail-closed behavior - throw or return false rather than proceeding
 * without org scoping.
 *
 * @param orgId - The organization ID to validate
 * @param context - Optional context string for error logging
 * @returns true if orgId is valid, false otherwise
 */
export function isValidOrgId(
  orgId: string | undefined | null,
  _context?: string,
): orgId is string {
  return typeof orgId === "string" && orgId.length > 0;
}

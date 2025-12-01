import { Types } from "mongoose";

/**
 * Type for org-scoped filter with ObjectId variants.
 * Handles both string and ObjectId representations of orgId,
 * as well as both field naming conventions (orgId and org_id).
 */
type OrgScopedFilter = {
  _id: string | Types.ObjectId;
  $or: Array<{ orgId: string | Types.ObjectId } | { org_id: string | Types.ObjectId }>;
};

type OrgOnlyFilter = {
  $or: Array<{ orgId: string | Types.ObjectId } | { org_id: string | Types.ObjectId }>;
};

/**
 * Build an org-scoped filter for MongoDB/Mongoose queries.
 *
 * This handles both string and ObjectId representations of orgId,
 * as well as both field naming conventions (orgId and org_id).
 * Includes ObjectId variants to handle mixed storage scenarios.
 *
 * SECURITY: Always use this helper for tenant-scoped queries to prevent
 * cross-tenant data access.
 *
 * @param id - The document _id to filter on
 * @param orgId - The organization ID for tenant scoping (REQUIRED)
 * @returns A MongoDB filter object with _id and org scope (including ObjectId variants)
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
): OrgScopedFilter {
  // Build org filter with both string and ObjectId variants
  const orgAsObjectId = Types.ObjectId.isValid(orgId)
    ? new Types.ObjectId(orgId)
    : undefined;

  const orgConditions: Array<{ orgId: string | Types.ObjectId } | { org_id: string | Types.ObjectId }> = [
    { orgId },
    { org_id: orgId },
  ];

  // Add ObjectId variants if orgId is a valid ObjectId string
  if (orgAsObjectId) {
    orgConditions.push({ orgId: orgAsObjectId }, { org_id: orgAsObjectId });
  }

  return {
    _id: id,
    $or: orgConditions,
  };
}

/**
 * Build an org-scoped filter without _id constraint.
 *
 * Use this for queries that need org scoping but filter on other fields.
 * Includes ObjectId variants to handle mixed storage scenarios.
 *
 * @param orgId - The organization ID for tenant scoping (REQUIRED)
 * @returns A MongoDB filter object with org scope only (including ObjectId variants)
 *
 * @example
 * ```typescript
 * const orgFilter = buildOrgOnlyFilter(orgId);
 * const payments = await AqarPayment.find({ ...orgFilter, status: 'COMPLETED' });
 * ```
 */
export function buildOrgOnlyFilter(orgId: string): OrgOnlyFilter {
  // Build org filter with both string and ObjectId variants
  const orgAsObjectId = Types.ObjectId.isValid(orgId)
    ? new Types.ObjectId(orgId)
    : undefined;

  const orgConditions: Array<{ orgId: string | Types.ObjectId } | { org_id: string | Types.ObjectId }> = [
    { orgId },
    { org_id: orgId },
  ];

  // Add ObjectId variants if orgId is a valid ObjectId string
  if (orgAsObjectId) {
    orgConditions.push({ orgId: orgAsObjectId }, { org_id: orgAsObjectId });
  }

  return {
    $or: orgConditions,
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

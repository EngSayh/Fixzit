import { Types } from 'mongoose';
import { ObjectId as MongoObjectId, type Filter, type Document } from 'mongodb';

/**
 * Shared tenant filter for Souq services/routes.
 * 
 * ## 3-Variant ObjectId Matching (PERMANENT - Dec 2024)
 * 
 * This function implements a permanent 3-variant ObjectId matching strategy to handle
 * data stored in different formats across the codebase and database:
 * 
 * 1. **String format**: Plain string representation of ObjectId (e.g., "507f1f77bcf86cd799439011")
 * 2. **MongoDB driver ObjectId**: Native driver ObjectId (`new mongodb.ObjectId(...)`)
 * 3. **Mongoose Types.ObjectId**: Mongoose wrapper ObjectId (`new mongoose.Types.ObjectId(...)`)
 * 
 * This is necessary because:
 * - Legacy data may have been stored as strings
 * - Different parts of the codebase may use different ObjectId implementations
 * - MongoDB driver and Mongoose ObjectId are technically different classes
 * - Prevents "no documents found" issues due to type mismatches
 * 
 * @note This 3-variant matching is INTENTIONAL and PERMANENT. Do not reduce to 2 variants.
 * @see PR #464 for the history of this decision
 * 
 * Behavior:
 * - Throws on empty orgId by default (STRICT v4.1).
 * - Accepts string/ObjectId and matches all three forms for robust tenant isolation.
 * - allowOrgless is for tests/legacy only.
 */
export const buildSouqOrgFilter = (
  orgId: string | Types.ObjectId,
  options: { allowOrgless?: boolean } = {},
): Filter<Document> => {
  const raw = typeof orgId === 'string' ? orgId?.trim?.() : orgId;
  if (!raw && !options.allowOrgless) {
    throw new Error('orgId is required for tenant-scoped operations (Souq STRICT v4.1)');
  }
  const candidates: Array<string | Types.ObjectId | MongoObjectId> = [];
  if (raw) {
    const asString = raw.toString();
    candidates.push(asString);
    if (MongoObjectId.isValid(asString)) {
      candidates.push(new MongoObjectId(asString));
      // Ensure we also match documents created with mongoose.Types.ObjectId (driver ObjectId)
      candidates.push(new Types.ObjectId(asString));
    }
    if (raw instanceof Types.ObjectId) {
      candidates.push(raw);
    }
  }
  if (options.allowOrgless) {
    return candidates.length
      ? {
          $or: [
            { orgId: { $in: candidates } },
            { org_id: { $in: candidates } },
            { orgId: { $exists: false } },
            { org_id: { $exists: false } },
          ],
        }
      : { $or: [{ orgId: { $exists: false } }, { org_id: { $exists: false } }] };
  }
  if (!candidates.length) {
    return { orgId: raw as string };
  }
  return {
    $or: [{ orgId: { $in: candidates } }, { org_id: { $in: candidates } }],
  };
};

/**
 * Build an org filter that handles both orgId and org_id fields.
 * Used by claims API routes for tenant isolation.
 * 
 * This function returns a Mongoose-compatible filter (vs Filter<Document>
 * from buildSouqOrgFilter) while still handling both field naming conventions
 * to match legacy data that may use org_id instead of orgId.
 * 
 * @since Sprint 23 SEC-CLAIMS-001 - Now handles both orgId and org_id
 */
export const buildOrgScopeFilter = (orgId: string | MongoObjectId) => {
  const normalized =
    typeof orgId === "string" ? orgId.trim() : orgId?.toString?.();
  const candidates: Array<string | MongoObjectId> = [];
  if (normalized) {
    candidates.push(normalized);
    if (MongoObjectId.isValid(normalized)) {
      candidates.push(new MongoObjectId(normalized));
    }
  }
  // Handle both orgId and org_id fields for legacy data compatibility
  return candidates.length 
    ? { $or: [{ orgId: { $in: candidates } }, { org_id: { $in: candidates } }] } 
    : { $or: [{ orgId: normalized }, { org_id: normalized }] };
};

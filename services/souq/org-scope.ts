import { Types } from 'mongoose';
import { ObjectId as MongoObjectId, type Filter, type Document } from 'mongodb';

/**
 * Shared tenant filter for Souq services/routes.
 * - Throws on empty orgId by default (STRICT v4.1).
 * - Accepts string/ObjectId and matches both string + ObjectId forms for legacy data.
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
 * Build a simpler org filter that only uses orgId field (not org_id).
 * Used by claims API routes.
 * 
 * @deprecated Prefer buildSouqOrgFilter which handles both orgId and org_id
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
  return candidates.length ? { orgId: { $in: candidates } } : { orgId: normalized };
};

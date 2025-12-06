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
    }
    if (raw instanceof Types.ObjectId) {
      candidates.push(raw);
    }
  }
  if (options.allowOrgless) {
    return candidates.length
      ? { $or: [{ orgId: { $in: candidates } }, { orgId: { $exists: false } }] }
      : { orgId: { $exists: false } };
  }
  return candidates.length ? { orgId: { $in: candidates } } : { orgId: raw as string };
};

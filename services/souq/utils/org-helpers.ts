import {
  ObjectId,
  type Collection,
  type Document,
  type Filter,
  type WithId,
} from "mongodb";

export type OrgCandidates = (string | ObjectId)[];

/**
 * Normalize orgId to support both string and legacy ObjectId representations.
 */
export function buildOrgCandidates(orgId: string): OrgCandidates {
  return ObjectId.isValid(orgId) ? [orgId, new ObjectId(orgId)] : [orgId];
}

/**
 * Find documents using orgId $in, with a fallback to primary orgId when mocks/drivers
 * do not support $in on string/ObjectId mixes.
 */
export async function findWithOrgFallback<TSchema extends Document = Document>(
  collection: Collection<TSchema>,
  filter: Filter<TSchema>,
  orgCandidates: OrgCandidates,
): Promise<WithId<TSchema>[]> {
  const baseFilter: Filter<TSchema> = { ...filter, orgId: { $in: orgCandidates } };
  let results: WithId<TSchema>[] = [];
  try {
    results = await collection.find(baseFilter).toArray();
  } catch (_err) {
    results = [];
  }

  if (results.length === 0 && orgCandidates.length > 0) {
    const fallbackFilter: Filter<TSchema> = { ...filter, orgId: orgCandidates[0] };
    results = await collection.find(fallbackFilter).toArray();
  }

  return results;
}

/**
 * Build a dual-type org filter (string + ObjectId) for direct use in queries.
 */
export function buildOrgFilter(orgId: string): { $in: OrgCandidates } {
  return { $in: buildOrgCandidates(orgId) };
}

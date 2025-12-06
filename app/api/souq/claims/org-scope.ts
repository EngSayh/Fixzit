import { ObjectId } from "mongodb";

/**
 * Build a tenant-aware org filter that matches string or ObjectId org values.
 */
export const buildOrgScopeFilter = (orgId: string | ObjectId) => {
  const normalized =
    typeof orgId === "string" ? orgId.trim() : orgId?.toString?.();
  const candidates: Array<string | ObjectId> = [];
  if (normalized) {
    candidates.push(normalized);
    if (ObjectId.isValid(normalized)) {
      candidates.push(new ObjectId(normalized));
    }
  }
  return candidates.length ? { orgId: { $in: candidates } } : { orgId: normalized };
};

import type { Model } from "mongoose";

type AggregateOptions = {
  maxResults?: number;
  maxTimeMS?: number;
};

/**
 * Tenant-safe aggregate helper that always scopes by orgId and applies sensible limits.
 */
export async function aggregateWithTenantScope<TDocument = unknown>(
  model: Pick<Model<unknown>, "aggregate">,
  orgId: string,
  pipeline: Record<string, unknown>[],
  options: AggregateOptions = {},
): Promise<TDocument[]> {
  if (!orgId) {
    throw new Error("orgId is required for tenant-scoped aggregates");
  }

  const scopedPipeline = [
    { $match: { orgId } },
    ...pipeline,
    ...(options.maxResults ? [{ $limit: options.maxResults }] : []),
  ];

  const maxTimeMS = options.maxTimeMS ?? 30_000;

  return model.aggregate(scopedPipeline, { maxTimeMS });
}

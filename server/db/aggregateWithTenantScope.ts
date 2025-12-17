import type { Model, PipelineStage } from "mongoose";

type AggregateOptions = {
  maxResults?: number;
  maxTimeMS?: number;
};

/**
 * Enforce tenant scoping for aggregate pipelines with optional safety defaults.
 */
export async function aggregateWithTenantScope<TDoc = unknown>(
  model: Model<unknown>,
  orgId: string | unknown,
  pipeline: PipelineStage[],
  options: AggregateOptions = {},
) {
  const tenantMatch: PipelineStage.Match = { $match: { orgId } };
  const limitStage =
    typeof options.maxResults === "number" && options.maxResults > 0
      ? [{ $limit: options.maxResults }] satisfies PipelineStage[]
      : [];

  return model.aggregate<TDoc>(
    [tenantMatch, ...pipeline, ...limitStage],
    {
      maxTimeMS: options.maxTimeMS ?? 30_000,
    },
  );
}

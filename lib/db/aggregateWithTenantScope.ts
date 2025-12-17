import type { Model, PipelineStage } from "mongoose";

type AggregateOptions = {
  maxResults?: number;
  maxTimeMS?: number;
};

/**
 * Tenant-safe aggregate helper that always scopes by orgId and applies sensible limits.
 * 
 * IMPORTANT: Handles MongoDB stages that MUST be first:
 * - $search / $vectorSearch (Atlas Search)
 * - $geoNear (geospatial queries)
 * 
 * For these stages, tenant $match is injected AFTER the first stage.
 * For all other cases, $match is prepended to ensure tenant isolation.
 */
export async function aggregateWithTenantScope<TDocument = unknown>(
  model: Pick<Model<unknown>, "aggregate">,
  orgId: string,
  pipeline: PipelineStage[],
  options: AggregateOptions = {},
): Promise<TDocument[]> {
  if (!orgId) {
    throw new Error("orgId is required for tenant-scoped aggregates");
  }

  const tenantMatch: PipelineStage = { $match: { orgId } };
  
  // Check if first stage MUST be first (MongoDB requirement)
  const firstStage = pipeline[0];
  const mustBeFirstStages = ["$search", "$vectorSearch", "$geoNear"];
  const firstStageKey = firstStage ? Object.keys(firstStage)[0] : null;
  const isFirstStageMustBeFirst = firstStageKey && mustBeFirstStages.includes(firstStageKey);
  
  let scopedPipeline: PipelineStage[];
  
  if (isFirstStageMustBeFirst) {
    // Inject tenant match AFTER the must-be-first stage
    scopedPipeline = [
      pipeline[0],
      tenantMatch,
      ...pipeline.slice(1),
    ];
  } else if (firstStageKey === "$match") {
    // Merge tenant scope into existing first $match stage
    const existingMatch = pipeline[0] as PipelineStage.Match;
    scopedPipeline = [
      { $match: { ...existingMatch.$match, orgId } },
      ...pipeline.slice(1),
    ];
  } else {
    // Default: prepend tenant match
    scopedPipeline = [tenantMatch, ...pipeline];
  }
  
  // Apply limit if specified
  if (options.maxResults) {
    scopedPipeline.push({ $limit: options.maxResults });
  }

  const maxTimeMS = options.maxTimeMS ?? 30_000;

  return model.aggregate(scopedPipeline, { maxTimeMS });
}

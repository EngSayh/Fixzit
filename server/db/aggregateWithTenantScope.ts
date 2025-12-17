/**
 * Tenant-Scoped Aggregate Wrapper
 * Enforces org-level isolation and pagination for MongoDB aggregation pipelines
 * 
 * @module server/db/aggregateWithTenantScope
 * 
 * Security: F2 - Preventive measure against cross-tenant data leaks
 * - Automatically prepends { $match: { orgId } } to all pipelines
 * - Enforces maxTimeMS to prevent runaway queries
 * - Optional pagination via $limit
 * 
 * Usage:
 * ```typescript
 * const results = await aggregateWithTenantScope<ResultType>(
 *   IssueModel,
 *   session.user.orgId,
 *   [
 *     { $group: { _id: "$status", count: { $sum: 1 } } },
 *     { $sort: { count: -1 } }
 *   ],
 *   { maxResults: 100, maxTimeMS: 5000 }
 * );
 * ```
 */

import type { Model, PipelineStage } from "mongoose";
import { logger } from "@/lib/logger";

export interface AggregateOptions {
  /**
   * Maximum number of documents to return (adds $limit stage)
   * Default: none (returns all matching documents)
   */
  maxResults?: number;

  /**
   * Maximum execution time in milliseconds
   * Default: 30000 (30 seconds)
   */
  maxTimeMS?: number;

  /**
   * Skip tenant filter (DANGEROUS - requires superadmin context)
   * Default: false
   */
  skipTenantFilter?: boolean;

  /**
   * Audit context for logging
   */
  auditContext?: {
    userId?: string;
    action?: string;
    reason?: string;
  };
}

/**
 * Execute aggregation pipeline with automatic tenant scoping
 * 
 * @param model - Mongoose model to aggregate on
 * @param orgId - Organization ID for tenant isolation
 * @param pipeline - Aggregation pipeline stages (WITHOUT leading $match)
 * @param opts - Optional configuration
 * @returns Aggregation results
 * 
 * @throws {Error} If orgId is missing and skipTenantFilter is false
 */
export async function aggregateWithTenantScope<T = any>(
  model: Model<any>,
  orgId: string | null | undefined,
  pipeline: PipelineStage[],
  opts?: AggregateOptions
): Promise<T[]> {
  const {
    maxResults,
    maxTimeMS = 30000,
    skipTenantFilter = false,
    auditContext,
  } = opts || {};

  // Validate orgId unless explicitly skipped (superadmin use case)
  if (!skipTenantFilter && (!orgId || typeof orgId !== "string" || orgId.trim() === "")) {
    logger.error("[aggregateWithTenantScope] Missing or invalid orgId", {
      model: model.modelName,
      skipTenantFilter,
      auditContext,
    });
    throw new Error(`[aggregateWithTenantScope] orgId is required for tenant-scoped queries on ${model.modelName}`);
  }

  // Build tenant filter stage (skip if superadmin bypass enabled)
  const tenantMatchStage: PipelineStage[] = skipTenantFilter
    ? []
    : [{ $match: { orgId: orgId as string } }];

  // Add optional limit stage
  const limitStage: PipelineStage[] = maxResults
    ? [{ $limit: maxResults }]
    : [];

  // Combine stages: [tenantMatch, ...userPipeline, limit?]
  const fullPipeline: PipelineStage[] = [
    ...tenantMatchStage,
    ...pipeline,
    ...limitStage,
  ];

  // Log for audit trail (if context provided)
  if (auditContext || skipTenantFilter) {
    logger.info("[aggregateWithTenantScope] Executing aggregate", {
      model: model.modelName,
      orgId: skipTenantFilter ? "[SKIP]" : orgId,
      stages: pipeline.length,
      maxResults,
      maxTimeMS,
      skipTenantFilter,
      auditContext,
    });
  }

  // Execute aggregation with timeout protection
  try {
    const results = await model.aggregate<T>(fullPipeline, {
      maxTimeMS,
    });

    return results;
  } catch (error) {
    logger.error("[aggregateWithTenantScope] Aggregation failed", error, {
      model: model.modelName,
      orgId: skipTenantFilter ? "[SKIP]" : orgId,
      stages: pipeline.length,
      maxTimeMS,
      auditContext,
    });
    throw error;
  }
}

/**
 * Helper: Aggregate with superadmin bypass (no tenant filter)
 * WARNING: Only use for system-wide analytics with proper audit trail
 */
export async function aggregateWithoutTenantFilter<T = any>(
  model: Model<any>,
  pipeline: PipelineStage[],
  opts?: Omit<AggregateOptions, "skipTenantFilter"> & {
    auditContext: Required<AggregateOptions["auditContext"]>;
  }
): Promise<T[]> {
  if (!opts?.auditContext || !opts.auditContext.userId) {
    throw new Error("[aggregateWithoutTenantFilter] auditContext with userId is required for superadmin aggregations");
  }

  return aggregateWithTenantScope<T>(model, null, pipeline, {
    ...opts,
    skipTenantFilter: true,
  });
}

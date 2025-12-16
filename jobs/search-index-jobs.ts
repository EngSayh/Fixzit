import { Queue, Worker, Job } from "bullmq";
import { SearchIndexerService } from "@/services/souq/search-indexer-service";
import Redis from "ioredis";
import { logger } from "@/lib/logger";

// Support REDIS_URL or REDIS_KEY (Vercel/GitHub naming convention)
const bullRedisUrl = process.env.BULLMQ_REDIS_URL || process.env.REDIS_URL || process.env.REDIS_KEY;
const bullRedisHost = process.env.BULLMQ_REDIS_HOST;
const bullRedisPort = parseInt(process.env.BULLMQ_REDIS_PORT || "6379", 10);
const bullRedisPassword =
  process.env.BULLMQ_REDIS_PASSWORD || process.env.REDIS_PASSWORD;
const hasBullRedisConfig = Boolean(bullRedisUrl || bullRedisHost);
const DEFAULT_SEARCH_ORG_ID =
  process.env.DEFAULT_ORG_ID || process.env.PUBLIC_ORG_ID;

const resolveOrgId = (orgId?: string): string => {
  const effectiveOrgId = orgId || DEFAULT_SEARCH_ORG_ID;
  if (!effectiveOrgId) {
    throw new Error(
      "[SearchIndex] orgId is required for indexing jobs (STRICT v4.1 tenant isolation)",
    );
  }
  return effectiveOrgId;
};

const connection = hasBullRedisConfig
  ? bullRedisUrl
    ? new Redis(bullRedisUrl, { maxRetriesPerRequest: null })
    : new Redis({
        host: bullRedisHost!,
        port: bullRedisPort,
        password: bullRedisPassword,
        maxRetriesPerRequest: null,
      })
  : null;

if (!connection) {
  logger.warn(
    "[SearchIndex] Redis not configured. Search indexing queue is disabled.",
  );
} else {
  connection.on("error", (error) => {
    logger.error("[SearchIndex] Redis connection error", { error });
  });
}

// ============================================================================
// QUEUE DEFINITIONS
// ============================================================================

export const searchIndexQueue = connection
  ? new Queue("search-indexing", { connection })
  : null;

// ============================================================================
// JOB TYPES
// ============================================================================

interface FullReindexJob {
  type: "full_reindex";
  target: "products" | "sellers" | "all";
  orgId: string;
}

interface IncrementalUpdateJob {
  type: "incremental_update";
  target: "product" | "seller";
  id: string; // listingId or sellerId
  orgId: string;
}

interface DeleteFromIndexJob {
  type: "delete";
  target: "product" | "seller";
  id: string; // fsin or sellerId
  orgId: string;
}

type SearchIndexJobData =
  | FullReindexJob
  | IncrementalUpdateJob
  | DeleteFromIndexJob;

// ============================================================================
// JOB SCHEDULERS
// ============================================================================

/**
 * Schedule daily full reindex
 * Runs at 2:00 AM Saudi time (UTC+3)
 */
export async function scheduleFullReindex() {
  if (!searchIndexQueue) {
    logger.warn(
      "[SearchIndex] Cannot schedule full reindex - Redis not configured",
    );
    return;
  }
  const defaultOrgId = DEFAULT_SEARCH_ORG_ID;
  if (!defaultOrgId) {
    logger.warn(
      "[SearchIndex] Skipping scheduled full reindex - DEFAULT_ORG_ID/PUBLIC_ORG_ID not set (STRICT v4.1 tenant isolation)",
    );
    return;
  }
  await searchIndexQueue.add(
    "full_reindex",
    {
      type: "full_reindex",
      target: "all",
      orgId: defaultOrgId,
    } as FullReindexJob,
    {
      repeat: {
        pattern: "0 2 * * *", // 2 AM daily
        tz: "Asia/Riyadh",
      },
      jobId: "full_reindex_daily",
    },
  );

  logger.info("[SearchIndex] Scheduled daily full reindex at 2:00 AM");
}

/**
 * Trigger immediate full reindex (manual)
 */
export async function triggerFullReindex(
  target: "products" | "sellers" | "all" = "all",
  orgId?: string,
) {
  if (!searchIndexQueue) {
    logger.warn("[SearchIndex] Cannot trigger reindex - Redis not configured");
    return null;
  }
  const resolvedOrgId = resolveOrgId(orgId);
  const job = await searchIndexQueue.add(
    "full_reindex",
    {
      type: "full_reindex",
      target,
      orgId: resolvedOrgId,
    } as FullReindexJob,
    {
      priority: 1, // High priority for manual trigger
    },
  );

  logger.info(`[SearchIndex] Triggered full reindex: ${job.id}`);
  return job.id;
}

/**
 * Trigger incremental update (on listing create/update)
 */
export async function triggerIncrementalUpdate(
  target: "product" | "seller",
  id: string,
  orgId: string,
) {
  if (!searchIndexQueue) {
    logger.warn(
      "[SearchIndex] Cannot queue incremental update - Redis not configured",
    );
    return null;
  }
  const job = await searchIndexQueue.add(
    "incremental_update",
    {
      type: "incremental_update",
      target,
      id,
      orgId,
    } as IncrementalUpdateJob,
    {
      priority: 5, // Medium priority
      attempts: 3, // Retry 3 times on failure
      backoff: {
        type: "exponential",
        delay: 1000, // Start with 1 second
      },
    },
  );

  logger.info(`[SearchIndex] Triggered incremental update: ${target} ${id}`);
  return job.id;
}

/**
 * Trigger deletion from index (on listing delete)
 */
export async function triggerDeleteFromIndex(
  target: "product" | "seller",
  id: string,
  orgId: string,
) {
  if (!searchIndexQueue) {
    logger.warn("[SearchIndex] Cannot queue delete - Redis not configured");
    return null;
  }
  const job = await searchIndexQueue.add(
    "delete",
    {
      type: "delete",
      target,
      id,
      orgId,
    } as DeleteFromIndexJob,
    {
      priority: 10, // Low priority (deletions can be delayed)
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    },
  );

  logger.info(`[SearchIndex] Triggered delete from index: ${target} ${id}`);
  return job.id;
}

// ============================================================================
// WORKER PROCESSOR
// ============================================================================

/**
 * Process search indexing jobs
 */
async function processSearchIndexJob(job: Job<SearchIndexJobData>) {
  logger.info(`[SearchIndex] Processing job: ${job.name} (${job.id})`);

  try {
    const { data } = job;

    switch (data.type) {
      case "full_reindex": {
        if (!data.orgId) {
          throw new Error(
            "orgId missing for full_reindex job (STRICT v4.1 tenant isolation)",
          );
        }
        // Extract after guard check to satisfy TypeScript narrowing
        const reindexOrgId: string = data.orgId;
        
        if (data.target === "products" || data.target === "all") {
          const result = await SearchIndexerService.fullReindexProducts({
            orgId: reindexOrgId,
          });
          await job.updateProgress(50);
          logger.info(`[SearchIndex] Products reindexed: ${result.indexed}`);
        }

        if (data.target === "sellers" || data.target === "all") {
          const result = await SearchIndexerService.fullReindexSellers({
            orgId: reindexOrgId,
          });
          await job.updateProgress(100);
          logger.info(`[SearchIndex] Sellers reindexed: ${result.indexed}`);
        }
        break;
      }

      case "incremental_update": {
        if (data.target === "product") {
          await SearchIndexerService.updateListing(data.id, {
            orgId: data.orgId,
          });
        } else if (data.target === "seller") {
          await SearchIndexerService.updateSeller(data.id, {
            orgId: data.orgId,
          });
        }
        await job.updateProgress(100);
        break;
      }

      case "delete": {
        await SearchIndexerService.deleteFromIndex(data.id, {
          orgId: data.orgId,
        });
        await job.updateProgress(100);
        break;
      }

      default:
        throw new Error(
          `Unknown job type: ${(data as SearchIndexJobData).type}`,
        );
    }

    logger.info(`[SearchIndex] Job completed: ${job.id}`);
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[SearchIndex] Job failed", { jobId: job.id, error });
    throw error; // Let BullMQ handle retries
  }
}

// ============================================================================
// WORKER INITIALIZATION
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let worker: Worker<any, any> | null = null;

/**
 * Start the search indexing worker
 */
export function startSearchIndexWorker() {
  if (!connection) {
    logger.warn("[SearchIndex] Worker disabled - Redis not configured");
    return null;
  }
  if (worker) {
    logger.warn("[SearchIndex] Worker already running");
    return worker;
  }

  worker = new Worker("search-indexing", processSearchIndexJob, {
    connection,
    concurrency: 2, // Process 2 jobs in parallel
    limiter: {
      max: 10, // Max 10 jobs per interval
      duration: 60000, // 1 minute
    },
  });

  worker.on("completed", (job: Job) => {
    logger.info(`[SearchIndex] Job ${job.id} completed successfully`);
  });

  worker.on("failed", (job: Job | undefined, error: Error) => {
    logger.error("[SearchIndex] Job failed event", { jobId: job?.id, error });
  });

  worker.on("error", (error: Error) => {
    logger.error("[SearchIndex] Worker error event", { error });
  });

  logger.info("[SearchIndex] Worker started");

  // Schedule daily reindex
  scheduleFullReindex();

  return worker;
}

/**
 * Stop the search indexing worker
 */
export async function stopSearchIndexWorker() {
  if (worker === null) {
    logger.warn("[SearchIndex] Worker not running");
    return;
  }

  await worker.close();
  worker = null;
  logger.info("[SearchIndex] Worker stopped");
}

// ============================================================================
// HOOKS FOR LISTING LIFECYCLE
// ============================================================================

/**
 * Hook: Call this after listing created
 */
export async function onListingCreated(listingId: string, orgId: string) {
  await triggerIncrementalUpdate("product", listingId, orgId);
}

/**
 * Hook: Call this after listing updated
 */
export async function onListingUpdated(listingId: string, orgId: string) {
  await triggerIncrementalUpdate("product", listingId, orgId);
}

/**
 * Hook: Call this after listing deleted
 */
export async function onListingDeleted(fsin: string, orgId: string) {
  await triggerDeleteFromIndex("product", fsin, orgId);
}

/**
 * Hook: Call this after seller profile updated
 */
export async function onSellerUpdated(sellerId: string, orgId: string) {
  await triggerIncrementalUpdate("seller", sellerId, orgId);
}

// ============================================================================
// MANUAL ADMIN TRIGGERS
// ============================================================================

/**
 * Admin endpoint: Trigger full reindex via API
 */
export async function adminTriggerFullReindex(
  target: "products" | "sellers" | "all",
  orgId?: string,
) {
  return await triggerFullReindex(target, orgId);
}

import { Queue, Worker, Job } from "bullmq";
import { SearchIndexerService } from "@/services/souq/search-indexer-service";
import Redis from "ioredis";
import { logger } from "@/lib/logger";

const bullRedisUrl = process.env.BULLMQ_REDIS_URL || process.env.REDIS_URL;
const bullRedisHost = process.env.BULLMQ_REDIS_HOST;
const bullRedisPort = parseInt(process.env.BULLMQ_REDIS_PORT || "6379", 10);
const bullRedisPassword =
  process.env.BULLMQ_REDIS_PASSWORD || process.env.REDIS_PASSWORD;
const hasBullRedisConfig = Boolean(bullRedisUrl || bullRedisHost);

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
}

interface IncrementalUpdateJob {
  type: "incremental_update";
  target: "product" | "seller";
  id: string; // listingId or sellerId
}

interface DeleteFromIndexJob {
  type: "delete";
  target: "product" | "seller";
  id: string; // fsin or sellerId
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
  await searchIndexQueue.add(
    "full_reindex",
    {
      type: "full_reindex",
      target: "all",
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
) {
  if (!searchIndexQueue) {
    logger.warn("[SearchIndex] Cannot trigger reindex - Redis not configured");
    return null;
  }
  const job = await searchIndexQueue.add(
    "full_reindex",
    {
      type: "full_reindex",
      target,
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
        if (data.target === "products" || data.target === "all") {
          const result = await SearchIndexerService.fullReindexProducts();
          await job.updateProgress(50);
          logger.info(`[SearchIndex] Products reindexed: ${result.indexed}`);
        }

        if (data.target === "sellers" || data.target === "all") {
          const result = await SearchIndexerService.fullReindexSellers();
          await job.updateProgress(100);
          logger.info(`[SearchIndex] Sellers reindexed: ${result.indexed}`);
        }
        break;
      }

      case "incremental_update": {
        if (data.target === "product") {
          await SearchIndexerService.updateListing(data.id);
        } else if (data.target === "seller") {
          await SearchIndexerService.updateSeller(data.id);
        }
        await job.updateProgress(100);
        break;
      }

      case "delete": {
        await SearchIndexerService.deleteFromIndex(data.id);
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

let worker: Worker | null = null;

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
  if (!worker) {
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
export async function onListingCreated(listingId: string) {
  await triggerIncrementalUpdate("product", listingId);
}

/**
 * Hook: Call this after listing updated
 */
export async function onListingUpdated(listingId: string) {
  await triggerIncrementalUpdate("product", listingId);
}

/**
 * Hook: Call this after listing deleted
 */
export async function onListingDeleted(fsin: string) {
  await triggerDeleteFromIndex("product", fsin);
}

/**
 * Hook: Call this after seller profile updated
 */
export async function onSellerUpdated(sellerId: string) {
  await triggerIncrementalUpdate("seller", sellerId);
}

// ============================================================================
// MANUAL ADMIN TRIGGERS
// ============================================================================

/**
 * Admin endpoint: Trigger full reindex via API
 */
export async function adminTriggerFullReindex(
  target: "products" | "sellers" | "all",
) {
  return await triggerFullReindex(target);
}

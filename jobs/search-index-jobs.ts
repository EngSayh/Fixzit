import { Queue, Worker, Job } from 'bullmq';
import { SearchIndexerService } from '@/services/souq/search-indexer-service';
import Redis from 'ioredis';

// Redis connection for BullMQ
const connection = new Redis({
  host: process.env.BULLMQ_REDIS_HOST || 'localhost',
  port: parseInt(process.env.BULLMQ_REDIS_PORT || '6379'),
  password: process.env.BULLMQ_REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

// ============================================================================
// QUEUE DEFINITIONS
// ============================================================================

export const searchIndexQueue = new Queue('search-indexing', { connection });

// ============================================================================
// JOB TYPES
// ============================================================================

interface FullReindexJob {
  type: 'full_reindex';
  target: 'products' | 'sellers' | 'all';
}

interface IncrementalUpdateJob {
  type: 'incremental_update';
  target: 'product' | 'seller';
  id: string; // listingId or sellerId
}

interface DeleteFromIndexJob {
  type: 'delete';
  target: 'product' | 'seller';
  id: string; // fsin or sellerId
}

type SearchIndexJobData = FullReindexJob | IncrementalUpdateJob | DeleteFromIndexJob;

// ============================================================================
// JOB SCHEDULERS
// ============================================================================

/**
 * Schedule daily full reindex
 * Runs at 2:00 AM Saudi time (UTC+3)
 */
export async function scheduleFullReindex() {
  await searchIndexQueue.add(
    'full_reindex',
    {
      type: 'full_reindex',
      target: 'all',
    } as FullReindexJob,
    {
      repeat: {
        pattern: '0 2 * * *', // 2 AM daily
        tz: 'Asia/Riyadh',
      },
      jobId: 'full_reindex_daily',
    }
  );

  console.log('[SearchIndex] Scheduled daily full reindex at 2:00 AM');
}

/**
 * Trigger immediate full reindex (manual)
 */
export async function triggerFullReindex(target: 'products' | 'sellers' | 'all' = 'all') {
  const job = await searchIndexQueue.add(
    'full_reindex',
    {
      type: 'full_reindex',
      target,
    } as FullReindexJob,
    {
      priority: 1, // High priority for manual trigger
    }
  );

  console.log(`[SearchIndex] Triggered full reindex: ${job.id}`);
  return job.id;
}

/**
 * Trigger incremental update (on listing create/update)
 */
export async function triggerIncrementalUpdate(
  target: 'product' | 'seller',
  id: string
) {
  const job = await searchIndexQueue.add(
    'incremental_update',
    {
      type: 'incremental_update',
      target,
      id,
    } as IncrementalUpdateJob,
    {
      priority: 5, // Medium priority
      attempts: 3, // Retry 3 times on failure
      backoff: {
        type: 'exponential',
        delay: 1000, // Start with 1 second
      },
    }
  );

  console.log(`[SearchIndex] Triggered incremental update: ${target} ${id}`);
  return job.id;
}

/**
 * Trigger deletion from index (on listing delete)
 */
export async function triggerDeleteFromIndex(
  target: 'product' | 'seller',
  id: string
) {
  const job = await searchIndexQueue.add(
    'delete',
    {
      type: 'delete',
      target,
      id,
    } as DeleteFromIndexJob,
    {
      priority: 10, // Low priority (deletions can be delayed)
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    }
  );

  console.log(`[SearchIndex] Triggered delete from index: ${target} ${id}`);
  return job.id;
}

// ============================================================================
// WORKER PROCESSOR
// ============================================================================

/**
 * Process search indexing jobs
 */
async function processSearchIndexJob(job: Job<SearchIndexJobData>) {
  console.log(`[SearchIndex] Processing job: ${job.name} (${job.id})`);

  try {
    const { data } = job;

    switch (data.type) {
      case 'full_reindex': {
        if (data.target === 'products' || data.target === 'all') {
          const result = await SearchIndexerService.fullReindexProducts();
          await job.updateProgress(50);
          console.log(`[SearchIndex] Products reindexed: ${result.indexed}`);
        }

        if (data.target === 'sellers' || data.target === 'all') {
          const result = await SearchIndexerService.fullReindexSellers();
          await job.updateProgress(100);
          console.log(`[SearchIndex] Sellers reindexed: ${result.indexed}`);
        }
        break;
      }

      case 'incremental_update': {
        if (data.target === 'product') {
          await SearchIndexerService.updateListing(data.id);
        } else if (data.target === 'seller') {
          await SearchIndexerService.updateSeller(data.id);
        }
        await job.updateProgress(100);
        break;
      }

      case 'delete': {
        await SearchIndexerService.deleteFromIndex(data.id);
        await job.updateProgress(100);
        break;
      }

      default:
        throw new Error(`Unknown job type: ${(data as SearchIndexJobData).type}`);
    }

    console.log(`[SearchIndex] Job completed: ${job.id}`);
  } catch (error) {
    console.error(`[SearchIndex] Job failed: ${job.id}`, error);
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
  if (worker) {
    console.warn('[SearchIndex] Worker already running');
    return worker;
  }

  worker = new Worker('search-indexing', processSearchIndexJob, {
    connection,
    concurrency: 2, // Process 2 jobs in parallel
    limiter: {
      max: 10, // Max 10 jobs per interval
      duration: 60000, // 1 minute
    },
  });

  worker.on('completed', (job: Job) => {
    console.log(`[SearchIndex] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job: Job | undefined, error: Error) => {
    console.error(`[SearchIndex] Job ${job?.id} failed:`, error);
  });

  worker.on('error', (error: Error) => {
    console.error('[SearchIndex] Worker error:', error);
  });

  console.log('[SearchIndex] Worker started');
  
  // Schedule daily reindex
  scheduleFullReindex();

  return worker;
}

/**
 * Stop the search indexing worker
 */
export async function stopSearchIndexWorker() {
  if (!worker) {
    console.warn('[SearchIndex] Worker not running');
    return;
  }

  await worker.close();
  worker = null;
  console.log('[SearchIndex] Worker stopped');
}

// ============================================================================
// HOOKS FOR LISTING LIFECYCLE
// ============================================================================

/**
 * Hook: Call this after listing created
 */
export async function onListingCreated(listingId: string) {
  await triggerIncrementalUpdate('product', listingId);
}

/**
 * Hook: Call this after listing updated
 */
export async function onListingUpdated(listingId: string) {
  await triggerIncrementalUpdate('product', listingId);
}

/**
 * Hook: Call this after listing deleted
 */
export async function onListingDeleted(fsin: string) {
  await triggerDeleteFromIndex('product', fsin);
}

/**
 * Hook: Call this after seller profile updated
 */
export async function onSellerUpdated(sellerId: string) {
  await triggerIncrementalUpdate('seller', sellerId);
}

// ============================================================================
// MANUAL ADMIN TRIGGERS
// ============================================================================

/**
 * Admin endpoint: Trigger full reindex via API
 */
export async function adminTriggerFullReindex(target: 'products' | 'sellers' | 'all') {
  return await triggerFullReindex(target);
}

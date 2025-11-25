/**
 * Package Activation Retry Queue
 *
 * Handles background retries for failed package activations after payment.
 * Uses BullMQ for reliable job processing with exponential backoff.
 */

import { Queue, Worker, Job } from "bullmq";
import { logger } from "@/lib/logger";
import IORedis from "ioredis";

const QUEUE_NAME = "package-activation-retry";
const MAX_ATTEMPTS = 5;

// Redis connection for BullMQ
const connection = process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
  : undefined;

// Queue instance
let queue: Queue | null = null;

/**
 * Get or create the activation retry queue
 */
export function getActivationQueue(): Queue | null {
  if (!connection) {
    logger.warn("[ActivationQueue] Redis not configured, queue disabled");
    return null;
  }

  if (!queue) {
    queue = new Queue(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: MAX_ATTEMPTS,
        backoff: {
          type: "exponential",
          delay: 60000, // Start with 1 minute
        },
        removeOnComplete: {
          age: 86400, // Keep completed jobs for 24 hours
          count: 1000,
        },
        removeOnFail: {
          age: 604800, // Keep failed jobs for 7 days
          count: 5000,
        },
      },
    });
  }

  return queue;
}

interface ActivationJobData {
  aqarPaymentId: string;
  invoiceId: string;
  attemptNumber?: number;
}

/**
 * Enqueue a package activation retry job
 */
export async function enqueueActivationRetry(
  aqarPaymentId: string,
  invoiceId: string,
): Promise<string | null> {
  const activationQueue = getActivationQueue();
  if (!activationQueue) {
    logger.warn("[ActivationQueue] Cannot enqueue - queue not available");
    return null;
  }

  try {
    const job = await activationQueue.add(
      "activate-package",
      {
        aqarPaymentId,
        invoiceId,
        attemptNumber: 0,
      } as ActivationJobData,
      {
        jobId: `activation-${aqarPaymentId}-${Date.now()}`,
      },
    );

    logger.info("[ActivationQueue] Enqueued activation retry", {
      jobId: job.id,
      aqarPaymentId,
      invoiceId,
    });

    return job.id || null;
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[ActivationQueue] Failed to enqueue retry", {
      error,
      aqarPaymentId,
      invoiceId,
    });
    return null;
  }
}

/**
 * Process activation retry jobs
 * Call this from a worker process (e.g., in a separate Node.js process or serverless function)
 */
export function startActivationWorker(): Worker | null {
  if (!connection) {
    logger.warn("[ActivationQueue] Redis not configured, worker disabled");
    return null;
  }

  const worker = new Worker<ActivationJobData>(
    QUEUE_NAME,
    async (job: Job<ActivationJobData>) => {
      const { aqarPaymentId, invoiceId } = job.data;

      logger.info("[ActivationQueue] Processing activation retry", {
        jobId: job.id,
        aqarPaymentId,
        invoiceId,
        attempt: job.attemptsMade,
      });

      try {
        // Import dynamically to avoid circular dependencies
        const { activatePackageAfterPayment } = await import(
          "@/lib/aqar/package-activation"
        );
        await activatePackageAfterPayment(aqarPaymentId);

        // Update invoice metadata on success
        const { Invoice } = await import("@/server/models/Invoice");
        const invoice = await Invoice.findById(invoiceId);
        if (invoice && invoice.metadata?.aqarPaymentId === aqarPaymentId) {
          invoice.metadata.activationStatus = "completed";
          invoice.metadata.activationCompletedAt = new Date();
          await invoice.save();
        }

        logger.info("[ActivationQueue] Package activated successfully", {
          aqarPaymentId,
          invoiceId,
        });
        return { success: true, aqarPaymentId, invoiceId };
      } catch (_error) {
        const error =
          _error instanceof Error ? _error : new Error(String(_error));
        void error;
        logger.error("[ActivationQueue] Activation attempt failed", {
          jobId: job.id,
          aqarPaymentId,
          invoiceId,
          attempt: job.attemptsMade,
          error,
        });

        // Update invoice metadata on failure
        try {
          const { Invoice } = await import("@/server/models/Invoice");
          const invoice = await Invoice.findById(invoiceId);
          if (invoice && invoice.metadata?.aqarPaymentId === aqarPaymentId) {
            invoice.metadata.lastActivationError =
              error instanceof Error ? error.message : String(error);
            invoice.metadata.lastActivationAttempt = new Date();
            await invoice.save();
          }
        } catch (updateError) {
          logger.error("[ActivationQueue] Failed to update invoice metadata", {
            updateError,
          });
        }

        throw error; // Re-throw to trigger retry
      }
    },
    {
      connection,
      concurrency: 5,
      limiter: {
        max: 10,
        duration: 60000, // Max 10 jobs per minute
      },
    },
  );

  worker.on("completed", (job) => {
    logger.info("[ActivationQueue] Job completed", { jobId: job.id });
  });

  worker.on("failed", (job, error) => {
    logger.error("[ActivationQueue] Job failed", {
      jobId: job?.id,
      attempts: job?.attemptsMade,
      error,
    });
  });

  logger.info("[ActivationQueue] Worker started");
  return worker;
}

/**
 * Graceful shutdown
 */
export async function closeActivationQueue(): Promise<void> {
  if (queue) {
    await queue.close();
    queue = null;
  }
  if (connection) {
    connection.disconnect();
  }
  logger.info("[ActivationQueue] Closed");
}

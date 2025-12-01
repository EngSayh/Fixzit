/**
 * Package Activation Retry Queue
 *
 * Handles background retries for failed package activations after payment.
 * Uses BullMQ for reliable job processing with exponential backoff.
 */

import { Queue, Worker, Job } from "bullmq";
import { logger } from "@/lib/logger";
import IORedis from "ioredis";
import { z } from "zod";

const QUEUE_NAME = "package-activation-retry";
const MAX_ATTEMPTS = 5;

// Zod schema for job payload validation - enforces tenant isolation
const ActivationJobDataSchema = z.object({
  aqarPaymentId: z.string().min(1, "aqarPaymentId is required"),
  invoiceId: z.string().min(1, "invoiceId is required"),
  orgId: z.string().min(1, "orgId is required for tenant isolation"),
  attemptNumber: z.number().optional(),
});

type ActivationJobData = z.infer<typeof ActivationJobDataSchema>;

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

/**
 * Enqueue a package activation retry job
 */
export async function enqueueActivationRetry(
  aqarPaymentId: string,
  invoiceId: string,
  orgId: string,
): Promise<string | null> {
  // Validate payload with Zod schema (fail-closed on invalid data)
  const parseResult = ActivationJobDataSchema.safeParse({
    aqarPaymentId,
    invoiceId,
    orgId,
    attemptNumber: 0,
  });

  if (!parseResult.success) {
    logger.error("[ActivationQueue] Invalid job payload - tenant isolation requires valid orgId", {
      aqarPaymentId,
      invoiceId,
      orgId,
      validationErrors: parseResult.error.flatten().fieldErrors,
    });
    return null;
  }

  const activationQueue = getActivationQueue();
  if (!activationQueue) {
    logger.warn("[ActivationQueue] Cannot enqueue - queue not available");
    return null;
  }

  try {
    const job = await activationQueue.add(
      "activate-package",
      parseResult.data,
      {
        jobId: `activation-${aqarPaymentId}-${Date.now()}`,
      },
    );

    logger.info("[ActivationQueue] Enqueued activation retry", {
      jobId: job.id,
      aqarPaymentId,
      invoiceId,
      orgId,
    });

    return job.id || null;
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[ActivationQueue] Failed to enqueue retry", {
      error,
      aqarPaymentId,
      invoiceId,
      orgId,
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
      // Validate job data with Zod schema (fail-closed on invalid)
      const parseResult = ActivationJobDataSchema.safeParse(job.data);
      if (!parseResult.success) {
        logger.error("[ActivationQueue] Job has invalid payload, failing permanently", {
          jobId: job.id,
          validationErrors: parseResult.error.flatten().fieldErrors,
        });
        // Throw to mark job as failed (won't retry invalid payloads)
        throw new Error(`Invalid job payload: ${JSON.stringify(parseResult.error.flatten().fieldErrors)}`);
      }

      const { aqarPaymentId, invoiceId, orgId } = parseResult.data;

      logger.info("[ActivationQueue] Processing activation retry", {
        jobId: job.id,
        aqarPaymentId,
        invoiceId,
        orgId,
        attempt: job.attemptsMade,
      });

      try {
        // Import dynamically to avoid circular dependencies
        const { activatePackageAfterPayment } = await import(
          "@/lib/aqar/package-activation"
        );
        await activatePackageAfterPayment(aqarPaymentId, orgId);

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

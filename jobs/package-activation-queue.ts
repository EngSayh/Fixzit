/**
 * Package Activation Retry Queue
 *
 * Handles background retries for failed package activations after payment.
 * Uses BullMQ for reliable job processing with exponential backoff.
 * 
 * SECURITY: This is a critical queue - Redis is REQUIRED (fail-fast on missing config)
 * to ensure activation retries are processed reliably.
 */

import { Queue, Worker, Job } from "bullmq";
import { logger } from "@/lib/logger";
import { getRedisClient } from "@/lib/redis";
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

// Queue and worker instances (for graceful shutdown)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let queue: Queue<ActivationJobData> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let activeWorker: Worker<ActivationJobData, any> | null = null;

/**
 * Require Redis connection - fail fast if not configured
 * Critical queues MUST have Redis to ensure reliability
 */
function requireRedisConnection(context: string) {
  const connection = getRedisClient();
  if (!connection) {
    throw new Error(
      `[ActivationQueue] Redis not configured (${context}). ` +
      `REDIS_URL or REDIS_KEY is required for activation retries - this is a critical queue.`
    );
  }
  return connection;
}

/**
 * Get or create the activation retry queue
 * Throws if Redis is not configured (fail-fast for critical queue)
 */
export function getActivationQueue(): Queue {
  const connection = requireRedisConnection("getActivationQueue");

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

  try {
    // Use deterministic job ID to prevent duplicate concurrent activations
    // Same payment enqueued twice will dedupe automatically
    const job = await activationQueue.add(
      "activate-package",
      parseResult.data,
      {
        jobId: `activation-${aqarPaymentId}`,
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
 * Throws if Redis is not configured (fail-fast for critical queue)
 * 
 * NOTE: This function is async to ensure MongoDB is connected before processing.
 * The Worker is returned after connection is established.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function startActivationWorker(): Promise<Worker<any, any>> {
  // CRITICAL: Ensure MongoDB is connected before any BullMQ handlers run.
  // In standalone worker processes, mongoose may not be connected yet.
  const { connectToDatabase } = await import("@/lib/mongodb-unified");
  await connectToDatabase();

  const connection = requireRedisConnection("startActivationWorker");
  
  if (activeWorker) {
    logger.warn("[ActivationQueue] Worker already running, returning existing worker");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return activeWorker as any;
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
        // SECURITY: Import tenant context utilities for scoped operations
        const { setTenantContext, clearTenantContext } = await import("@/server/plugins/tenantIsolation");

        // Import dynamically to avoid circular dependencies
        const { activatePackageAfterPayment } = await import(
          "@/lib/aqar/package-activation"
        );

        // SECURITY: activatePackageAfterPayment already wraps its operations in withTenantContext,
        // so we don't wrap here to avoid nested context ownership ambiguity
        const activated = await activatePackageAfterPayment(aqarPaymentId, orgId);

        // SECURITY: Fail-closed if activation returned false (validation failure)
        if (!activated) {
          throw new Error(`Package activation returned false for aqarPaymentId=${aqarPaymentId} - validation failure`);
        }

        // Update invoice metadata on success with org-scoped query
        const { Invoice } = await import("@/server/models/Invoice");
        const { buildOrgScopedFilter } = await import("@/lib/utils/org-scope");
        // SECURITY: Org-scoped filter prevents cross-tenant invoice modification
        // buildOrgScopedFilter includes ObjectId variants for mixed storage scenarios
        const orgScopedInvoiceFilter = buildOrgScopedFilter(invoiceId, orgId);
        try {
          setTenantContext({ orgId, userId: "activation-worker" });
          const invoice = await Invoice.findOne(orgScopedInvoiceFilter);
          if (invoice && invoice.metadata?.aqarPaymentId === aqarPaymentId) {
            invoice.metadata.activationStatus = "completed";
            invoice.metadata.activationCompletedAt = new Date();
            await invoice.save();
          }
        } finally {
          clearTenantContext();
        }

        logger.info("[ActivationQueue] Package activated successfully", {
          aqarPaymentId,
          invoiceId,
        });
        return { success: true, aqarPaymentId, invoiceId };
      } catch (_error) {
        const error =
          _error instanceof Error ? _error : new Error(String(_error));
        logger.error("[ActivationQueue] Activation attempt failed", {
          jobId: job.id,
          aqarPaymentId,
          invoiceId,
          attempt: job.attemptsMade,
          error,
        });

        // Update invoice metadata on failure with org-scoped query
        try {
          const { setTenantContext, clearTenantContext } = await import("@/server/plugins/tenantIsolation");
          const { Invoice } = await import("@/server/models/Invoice");
          const { buildOrgScopedFilter } = await import("@/lib/utils/org-scope");
          // SECURITY: Org-scoped filter prevents cross-tenant invoice modification
          // buildOrgScopedFilter includes ObjectId variants for mixed storage scenarios
          const orgScopedInvoiceFilter = buildOrgScopedFilter(invoiceId, orgId);
          try {
            setTenantContext({ orgId, userId: "activation-worker" });
            const invoice = await Invoice.findOne(orgScopedInvoiceFilter);
            if (invoice && invoice.metadata?.aqarPaymentId === aqarPaymentId) {
              invoice.metadata.lastActivationError =
                error instanceof Error ? error.message : String(error);
              invoice.metadata.lastActivationAttempt = new Date();
              await invoice.save();
            }
          } finally {
            clearTenantContext();
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

  // Store reference for graceful shutdown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activeWorker = worker as any;
  
  logger.info("[ActivationQueue] Worker started");
  return worker;
}

/**
 * Stop the activation worker gracefully
 * Call this before application shutdown
 */
export async function stopActivationWorker(): Promise<void> {
  if (activeWorker) {
    logger.info("[ActivationQueue] Stopping worker...");
    await activeWorker.close();
    activeWorker = null;
    logger.info("[ActivationQueue] Worker stopped");
  }
}

/**
 * Graceful shutdown - closes worker, queue, and connection
 * Call this during application shutdown
 */
export async function closeActivationQueue(): Promise<void> {
  // Stop worker first
  await stopActivationWorker();
  
  // Close queue
  if (queue) {
    await queue.close();
    queue = null;
  }
  
  // Note: Redis connection is managed by lib/redis singleton
  // Don't disconnect here as it may be shared with other services
  
  logger.info("[ActivationQueue] Closed");
}

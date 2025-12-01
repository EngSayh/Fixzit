/**
 * ZATCA Clearance Retry Queue
 *
 * Handles background retries for failed ZATCA clearance operations.
 * Picks up payments with zatca.complianceStatus = "PENDING_RETRY" and
 * re-attempts clearance with proper tenant scoping.
 *
 * Uses BullMQ for reliable job processing with exponential backoff.
 */

import { Queue, Worker, Job } from "bullmq";
import { logger } from "@/lib/logger";
import { getRedisClient } from "@/lib/redis";
import { fetchWithRetry } from "@/lib/http/fetchWithRetry";
import { SERVICE_RESILIENCE } from "@/config/service-timeouts";
import { z } from "zod";

const QUEUE_NAME = "zatca-clearance-retry";
const MAX_ATTEMPTS = 5;

// Zod schema for job payload validation - enforces tenant isolation
const ZatcaRetryJobDataSchema = z.object({
  aqarPaymentId: z.string().min(1, "aqarPaymentId is required"),
  orgId: z.string().min(1, "orgId is required for tenant isolation"),
  amount: z.number().positive("amount must be positive"),
  currency: z.string().default("SAR"),
  attemptNumber: z.number().optional(),
});

type ZatcaRetryJobData = z.infer<typeof ZatcaRetryJobDataSchema>;

// ZATCA resilience configuration
const zatcaResilience = SERVICE_RESILIENCE.zatca;

// Queue and worker instances (for graceful shutdown)
let queue: Queue | null = null;
let activeWorker: Worker | null = null;

/**
 * Require Redis connection - fail fast if not configured.
 * ZATCA is a critical compliance queue - silently disabling could cause
 * regulatory violations (invoices not being cleared with tax authority).
 */
function requireRedisConnection(context: string) {
  const connection = getRedisClient();
  if (!connection) {
    throw new Error(
      `[ZatcaRetryQueue] Redis not configured (${context}). ` +
      `REDIS_URL is required for ZATCA clearance retries - this is a critical compliance queue.`
    );
  }
  return connection;
}

/**
 * Get or create the ZATCA retry queue
 * Throws if Redis is not configured (fail-fast for critical compliance queue)
 */
export function getZatcaRetryQueue(): Queue {
  const connection = requireRedisConnection("getZatcaRetryQueue");

  if (!queue) {
    queue = new Queue(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: MAX_ATTEMPTS,
        backoff: {
          type: "exponential",
          delay: 300000, // Start with 5 minutes (ZATCA may have rate limits)
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
 * Enqueue a ZATCA clearance retry job
 */
export async function enqueueZatcaRetry(
  aqarPaymentId: string,
  orgId: string,
  amount: number,
  currency = "SAR",
): Promise<string | null> {
  // Validate payload with Zod schema (fail-closed on invalid data)
  const parseResult = ZatcaRetryJobDataSchema.safeParse({
    aqarPaymentId,
    orgId,
    amount,
    currency,
    attemptNumber: 0,
  });

  if (!parseResult.success) {
    logger.error("[ZatcaRetryQueue] Invalid job payload - tenant isolation requires valid orgId", {
      aqarPaymentId,
      orgId,
      validationErrors: parseResult.error.flatten().fieldErrors,
    });
    return null;
  }

  const zatcaQueue = getZatcaRetryQueue();
  // getZatcaRetryQueue throws if Redis not configured, so queue is always valid here

  try {
    const job = await zatcaQueue.add(
      "zatca-clearance",
      parseResult.data,
      {
        jobId: `zatca-${aqarPaymentId}-${Date.now()}`,
      },
    );

    logger.info("[ZatcaRetryQueue] Enqueued ZATCA clearance retry", {
      jobId: job.id,
      aqarPaymentId,
      orgId,
      amount,
      currency,
    });

    return job.id || null;
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[ZatcaRetryQueue] Failed to enqueue retry", {
      error,
      aqarPaymentId,
      orgId,
    });
    return null;
  }
}

/**
 * Find payments needing ZATCA retry and enqueue them.
 * Call this from a scheduled job (e.g., cron) to pick up PENDING_RETRY payments.
 *
 * SECURITY: This function scans payments across orgs in a controlled manner.
 * Each payment is processed with its own tenant context, ensuring proper isolation.
 * The updateOne call uses buildOrgScopedFilter for tenant-safe writes.
 */
export async function scanAndEnqueuePendingRetries(): Promise<number> {
  let enqueuedCount = 0;

  try {
    const { connectToDatabase } = await import("@/lib/mongodb-unified");
    await connectToDatabase();

    const { AqarPayment } = await import("@/server/models/aqar");
    const { buildOrgScopedFilter } = await import("@/lib/utils/org-scope");

    // Find payments with PENDING_RETRY status that haven't been retried recently
    // NOTE: This cross-org scan is intentional for background job processing.
    // Each payment is subsequently processed within its own tenant context.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const pendingPayments = await AqarPayment.find({
      "zatca.complianceStatus": "PENDING_RETRY",
      // Handle both org field naming conventions (orgId and org_id)
      $or: [
        { orgId: { $exists: true, $ne: null } },
        { org_id: { $exists: true, $ne: null } },
      ],
      $and: [
        {
          $or: [
            { "zatca.lastRetryAt": { $exists: false } },
            { "zatca.lastRetryAt": { $lt: oneHourAgo } },
          ],
        },
      ],
    })
      .select("_id orgId org_id amount currency zatca")
      .limit(100) // Process in batches
      .lean();

    for (const payment of pendingPayments) {
      const paymentId = payment._id.toString();
      // Handle both org field naming conventions (orgId takes precedence for new data, org_id for legacy)
      const orgId = payment.orgId?.toString() ?? (payment as { org_id?: { toString(): string } }).org_id?.toString();

      if (!orgId) {
        logger.error("[ZatcaRetryQueue] Payment missing orgId/org_id, skipping", {
          paymentId,
        });
        continue;
      }

      const jobId = await enqueueZatcaRetry(
        paymentId,
        orgId,
        payment.amount,
        payment.currency || "SAR",
      );

      if (jobId) {
        // Mark that we've scheduled a retry using tenant-scoped filter
        await AqarPayment.updateOne(
          buildOrgScopedFilter(paymentId, orgId),
          { $set: { "zatca.lastRetryAt": new Date() } },
        );
        enqueuedCount++;
      }
    }

    logger.info("[ZatcaRetryQueue] Scan complete", {
      found: pendingPayments.length,
      enqueued: enqueuedCount,
    });

    return enqueuedCount;
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[ZatcaRetryQueue] Scan failed", { error });
    return enqueuedCount;
  }
}

/**
 * Process ZATCA retry jobs.
 * Call this from a worker process.
 * Throws if Redis is not configured (fail-fast for critical compliance queue)
 * 
 * NOTE: This function is async to ensure MongoDB is connected before processing.
 * The Worker is returned after connection is established.
 */
export async function startZatcaRetryWorker(): Promise<Worker> {
  // CRITICAL: Ensure MongoDB is connected before any BullMQ handlers run.
  // In standalone worker processes, mongoose may not be connected yet.
  const { connectToDatabase } = await import("@/lib/mongodb-unified");
  await connectToDatabase();

  // SECURITY: requireRedisConnection throws if Redis not configured
  // to ensure ZATCA compliance queue cannot be silently disabled
  const connection = requireRedisConnection("startZatcaRetryWorker");

  if (activeWorker) {
    return activeWorker;
  }

  const worker = new Worker<ZatcaRetryJobData>(
    QUEUE_NAME,
    async (job: Job<ZatcaRetryJobData>) => {
      // Validate job data
      const parseResult = ZatcaRetryJobDataSchema.safeParse(job.data);
      if (!parseResult.success) {
        logger.error("[ZatcaRetryQueue] Job has invalid payload, failing permanently", {
          jobId: job.id,
          validationErrors: parseResult.error.flatten().fieldErrors,
        });
        throw new Error(`Invalid job payload: ${JSON.stringify(parseResult.error.flatten().fieldErrors)}`);
      }

      const { aqarPaymentId, orgId, amount, currency } = parseResult.data;

      logger.info("[ZatcaRetryQueue] Processing ZATCA clearance retry", {
        jobId: job.id,
        aqarPaymentId,
        orgId,
        attempt: job.attemptsMade,
      });

      try {
        // Check required ZATCA envs - INSIDE try block so we can persist retry metadata on config failures
        const zatcaSellerName = process.env.ZATCA_SELLER_NAME;
        const zatcaVatNumber = process.env.ZATCA_VAT_NUMBER;
        const zatcaSellerAddress = process.env.ZATCA_SELLER_ADDRESS;
        const clearanceApiKey = process.env.ZATCA_API_KEY;

        if (!clearanceApiKey || !zatcaSellerName || !zatcaVatNumber || !zatcaSellerAddress) {
          const missingEnvs = [
            !clearanceApiKey && "ZATCA_API_KEY",
            !zatcaSellerName && "ZATCA_SELLER_NAME",
            !zatcaVatNumber && "ZATCA_VAT_NUMBER",
            !zatcaSellerAddress && "ZATCA_SELLER_ADDRESS",
          ].filter(Boolean);
          
          throw new Error(`ZATCA configuration incomplete - missing: ${missingEnvs.join(", ")}`);
        }
        const { setTenantContext, clearTenantContext } = await import("@/server/plugins/tenantIsolation");
        const { AqarPayment } = await import("@/server/models/aqar");
        const { buildOrgScopedFilter } = await import("@/lib/utils/org-scope");

        // Build invoice payload
        const invoicePayload = {
          invoiceType: "SIMPLIFIED",
          invoiceNumber: `PAY-${aqarPaymentId}`,
          issueDate: new Date().toISOString(),
          seller: {
            name: zatcaSellerName,
            vatNumber: zatcaVatNumber,
            address: zatcaSellerAddress,
          },
          total: String(amount),
          currency,
          vatAmount: String(+(amount * 0.15).toFixed(2)),
          items: [
            {
              description: "Payment via PayTabs (Retry)",
              quantity: 1,
              unitPrice: amount,
              vatRate: 0.15,
            },
          ],
        };

        const clearanceApiUrl =
          process.env.ZATCA_CLEARANCE_API_URL ||
          "https://gw-fatoora.zatca.gov.sa/e-invoicing/core/invoices/clearance/single";

        // Call ZATCA clearance API with resilience (retry + timeout)
        const response = await fetchWithRetry(clearanceApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${clearanceApiKey}`,
            Accept: "application/json",
          },
          body: JSON.stringify(invoicePayload),
        }, {
          timeoutMs: zatcaResilience.timeouts.clearanceMs,
          maxAttempts: zatcaResilience.retries.maxAttempts,
          retryDelayMs: zatcaResilience.retries.baseDelayMs,
          label: "zatca-clearance-retry",
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`ZATCA API returned ${response.status}: ${JSON.stringify(errorData)}`);
        }

        const clearanceResponse = await response.json();
        if (!clearanceResponse.clearanceStatus || clearanceResponse.clearanceStatus !== "CLEARED") {
          throw new Error(`ZATCA clearance not approved: ${clearanceResponse.clearanceStatus || "UNKNOWN"}`);
        }

        // Update payment with clearance evidence
        const clearanceId = clearanceResponse.clearanceId || clearanceResponse.uuid;
        const zatcaQR = clearanceResponse.qrCode;
        const invoiceHash = clearanceResponse.invoiceHash;

        if (!clearanceId || !zatcaQR) {
          throw new Error("ZATCA response missing required fields (clearanceId or qrCode)");
        }

        try {
          setTenantContext({ orgId, userId: "zatca-retry-worker" });
          
          await AqarPayment.updateOne(
            buildOrgScopedFilter(aqarPaymentId, orgId),
            {
              $set: {
                status: "COMPLETED",
                "zatca.complianceStatus": "CLEARED",
                "zatca.qrCode": zatcaQR,
                "zatca.invoiceHash": invoiceHash,
                "zatca.clearanceId": clearanceId,
                "zatca.clearedAt": new Date(),
                "zatca.retryCompletedAt": new Date(),
              },
            },
          );
        } finally {
          clearTenantContext();
        }

        logger.info("[ZatcaRetryQueue] ZATCA clearance successful", {
          aqarPaymentId,
          clearanceId: clearanceId?.toString().slice(0, 16) + "...",
        });

        return { success: true, aqarPaymentId, clearanceId };
      } catch (_error) {
        const error = _error instanceof Error ? _error : new Error(String(_error));
        void error;
        logger.error("[ZatcaRetryQueue] ZATCA clearance attempt failed", {
          jobId: job.id,
          aqarPaymentId,
          attempt: job.attemptsMade,
          error: error.message,
        });

        // Update last retry attempt time
        try {
          const { AqarPayment } = await import("@/server/models/aqar");
          const { buildOrgScopedFilter } = await import("@/lib/utils/org-scope");
          
          await AqarPayment.updateOne(
            buildOrgScopedFilter(aqarPaymentId, orgId),
            {
              $set: {
                "zatca.lastRetryAt": new Date(),
                "zatca.lastRetryError": error.message,
                "zatca.retryAttempts": job.attemptsMade + 1,
              },
            },
          );
        } catch (updateError) {
          logger.error("[ZatcaRetryQueue] Failed to update retry metadata", { updateError });
        }

        throw error; // Re-throw to trigger retry
      }
    },
    {
      connection,
      concurrency: 2, // Lower concurrency for ZATCA rate limits
      limiter: {
        max: 5,
        duration: 60000, // Max 5 jobs per minute
      },
    },
  );

  worker.on("completed", (job) => {
    logger.info("[ZatcaRetryQueue] Job completed", { jobId: job.id });
  });

  worker.on("failed", (job, error) => {
    logger.error("[ZatcaRetryQueue] Job failed", {
      jobId: job?.id,
      attempts: job?.attemptsMade,
      error: error.message,
    });
  });

  logger.info("[ZatcaRetryQueue] Worker started");
  activeWorker = worker;
  return worker;
}

/**
 * Graceful shutdown
 * Note: Redis connection is managed by shared singleton, not disconnected here
 */
export async function closeZatcaRetryQueue(): Promise<void> {
  if (activeWorker) {
    await activeWorker.close();
    activeWorker = null;
  }
  if (queue) {
    await queue.close();
    queue = null;
  }
  // Redis connection is managed by shared singleton in @/lib/redis
  // Do not disconnect here - other parts of the app may still need it
  logger.info("[ZatcaRetryQueue] Closed");
}

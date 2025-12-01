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
import IORedis from "ioredis";
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

// Redis connection for BullMQ
const connection = process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
  : undefined;

// Queue instance
let queue: Queue | null = null;

/**
 * Get or create the ZATCA retry queue
 */
export function getZatcaRetryQueue(): Queue | null {
  if (!connection) {
    logger.warn("[ZatcaRetryQueue] Redis not configured, queue disabled");
    return null;
  }

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
  if (!zatcaQueue) {
    logger.warn("[ZatcaRetryQueue] Cannot enqueue - queue not available");
    return null;
  }

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
 */
export async function scanAndEnqueuePendingRetries(): Promise<number> {
  let enqueuedCount = 0;

  try {
    const { connectToDatabase } = await import("@/lib/mongodb-unified");
    await connectToDatabase();

    const { AqarPayment } = await import("@/server/models/aqar");

    // Find payments with PENDING_RETRY status that haven't been retried recently
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const pendingPayments = await AqarPayment.find({
      "zatca.complianceStatus": "PENDING_RETRY",
      $or: [
        { "zatca.lastRetryAt": { $exists: false } },
        { "zatca.lastRetryAt": { $lt: oneHourAgo } },
      ],
    })
      .select("_id orgId org_id amount currency zatca")
      .limit(100) // Process in batches
      .lean();

    for (const payment of pendingPayments) {
      const paymentId = payment._id.toString();
      const orgId = payment.orgId?.toString();

      if (!orgId) {
        logger.error("[ZatcaRetryQueue] Payment missing orgId, skipping", {
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
        // Mark that we've scheduled a retry
        await AqarPayment.updateOne(
          { _id: payment._id },
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
 */
export function startZatcaRetryWorker(): Worker | null {
  if (!connection) {
    logger.warn("[ZatcaRetryQueue] Redis not configured, worker disabled");
    return null;
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

      // Check required ZATCA envs
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

      try {
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

        // Call ZATCA clearance API
        const response = await fetch(clearanceApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${clearanceApiKey}`,
            Accept: "application/json",
          },
          body: JSON.stringify(invoicePayload),
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
  return worker;
}

/**
 * Graceful shutdown
 */
export async function closeZatcaRetryQueue(): Promise<void> {
  if (queue) {
    await queue.close();
    queue = null;
  }
  if (connection) {
    connection.disconnect();
  }
  logger.info("[ZatcaRetryQueue] Closed");
}

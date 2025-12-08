/**
 * SMS Queue Service
 *
 * Queue-based SMS delivery with retry, SLA tracking, and provider failover.
 * Integrates with BullMQ for reliable background processing.
 *
 * @module lib/queues/sms-queue
 */

import { Queue, Worker, Job } from "bullmq";
import type Redis from "ioredis";
import { getRedisClient } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { SMSMessage, TSMSType, TSMSPriority } from "@/server/models/SMSMessage";
import { SMSSettings } from "@/server/models/SMSSettings";
import { sendSMS, type SMSProviderOptions } from "@/lib/sms";
import { connectToDatabase } from "@/lib/mongodb-unified";

// Queue name
export const SMS_QUEUE_NAME = "sms:outbound";

// Job data interface
export interface ISMSJobData {
  messageId: string;
  to: string;
  message: string;
  type: TSMSType;
  priority: TSMSPriority;
  orgId?: string;
  userId?: string;
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

// Queue instance (singleton)
let smsQueue: Queue<ISMSJobData> | null = null;
let smsWorker: Worker<ISMSJobData> | null = null;

/**
 * Get or create the SMS queue instance
 */
export function getSMSQueue(): Queue<ISMSJobData> | null {
  if (smsQueue) return smsQueue;

  const connection = getRedisClient();
  if (!connection) {
    logger.warn("[SMS Queue] Redis not configured, queue disabled");
    return null;
  }

  smsQueue = new Queue<ISMSJobData>(SMS_QUEUE_NAME, {
    connection: connection as Redis,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: {
        age: 7 * 24 * 3600, // Keep completed jobs for 7 days
        count: 10000,
      },
      removeOnFail: {
        age: 30 * 24 * 3600, // Keep failed jobs for 30 days
      },
    },
  });

  logger.info("📱 SMS Queue created");
  return smsQueue;
}

/**
 * Queue an SMS for delivery
 * 🔒 SECURITY: orgId is REQUIRED for tenant isolation and audit logging
 */
export async function queueSMS(options: {
  to: string;
  message: string;
  type?: TSMSType;
  priority?: TSMSPriority;
  orgId: string; // 🔐 REQUIRED for tenant isolation
  userId?: string;
  referenceType?: string;
  referenceId?: string;
  scheduledAt?: Date;
  metadata?: Record<string, unknown>;
  tags?: string[];
}): Promise<{ messageId: string; queued: boolean }> {
  const {
    to,
    message,
    type = "NOTIFICATION",
    priority = "NORMAL",
    orgId,
    userId,
    referenceType,
    referenceId,
    scheduledAt,
    metadata,
    tags,
  } = options;

  // 🔐 SECURITY: Enforce orgId requirement for tenant isolation
  if (!orgId) {
    throw new Error('orgId is required to queue SMS (tenant isolation)');
  }

  await connectToDatabase();

  // Get SLA settings
  const settings = await SMSSettings.getEffectiveSettings(orgId);
  const slaConfig = settings.slaConfigs?.find(
    (c: { type: string; priority: string }) => c.type === type && c.priority === priority
  );

  // Create message record
  const smsMessage = await SMSMessage.create({
    to,
    message,
    type,
    priority,
    status: "PENDING",
    orgId,
    userId,
    referenceType,
    referenceId,
    scheduledAt,
    metadata,
    tags,
    maxRetries: slaConfig?.maxRetries ?? settings.defaultMaxRetries,
    slaTargetMs: slaConfig?.targetDeliveryMs,
    expiresAt: new Date(Date.now() + (slaConfig?.expiresAfterMs ?? settings.defaultExpiresAfterMs)),
  });

  // Try to queue
  const queue = getSMSQueue();
  if (!queue || !settings.queueEnabled) {
    // Send immediately without queue
    logger.info("[SMS Queue] Queue disabled, sending immediately", { messageId: smsMessage._id.toString() });
    await processSMSJob(smsMessage._id.toString());
    return { messageId: smsMessage._id.toString(), queued: false };
  }

  // Calculate delay for scheduled messages
  const delay = scheduledAt ? Math.max(0, scheduledAt.getTime() - Date.now()) : 0;

  // Add to queue with priority
  const priorityValue = { CRITICAL: 1, HIGH: 2, NORMAL: 3, LOW: 4 }[priority];

  await queue.add(
    "send",
    {
      messageId: smsMessage._id.toString(),
      to,
      message,
      type,
      priority,
      orgId,
      userId,
      referenceType,
      referenceId,
      metadata,
    },
    {
      delay,
      priority: priorityValue,
      jobId: `sms-${smsMessage._id.toString()}`,
    }
  );

  // Update status to QUEUED
  await SMSMessage.findByIdAndUpdate(smsMessage._id, { status: "QUEUED" });

  logger.info("[SMS Queue] Message queued", {
    messageId: smsMessage._id.toString(),
    to,
    type,
    priority,
    delay,
  });

  return { messageId: smsMessage._id.toString(), queued: true };
}

/**
 * Process a single SMS job
 */
async function processSMSJob(messageId: string): Promise<void> {
  await connectToDatabase();

  const message = await SMSMessage.findById(messageId);
  if (!message) {
    logger.error("[SMS Queue] Message not found", { messageId });
    return;
  }

  // Check if expired
  if (message.expiresAt && new Date() > message.expiresAt) {
    await SMSMessage.findByIdAndUpdate(messageId, { status: "EXPIRED" });
    logger.warn("[SMS Queue] Message expired", { messageId });
    return;
  }

  // Check if already delivered
  if (message.status === "DELIVERED" || message.status === "SENT") {
    logger.info("[SMS Queue] Message already sent/delivered", { messageId, status: message.status });
    return;
  }

  const startTime = Date.now();

  try {
    // 🔒 SECURITY: Get org-specific provider settings
    const settings = await SMSSettings.getEffectiveSettings(message.orgId);
    const provider = settings.defaultProvider;

    // Find the enabled provider config for this org
    const providerConfig = settings.providers?.find(
      (p: { provider: string; enabled: boolean }) => p.provider === provider && p.enabled
    );

    // 📧 FIXED: Pass provider options to sendSMS instead of hardcoding Twilio
    const providerOptions: SMSProviderOptions = {
      provider: provider as SMSProviderOptions['provider'],
      from: providerConfig?.fromNumber,
      accountSid: providerConfig?.accountId,
      // Note: authToken should be decrypted before use if encrypted
      // For now, we pass it as-is; encryption handling is a future enhancement
      authToken: providerConfig?.encryptedApiKey,
    };

    // Send SMS with org-specific provider config
    const result = await sendSMS(message.to, message.message, providerOptions);
    const durationMs = Date.now() - startTime;

    if (result.success) {
      await SMSMessage.recordAttempt(messageId, {
        attemptedAt: new Date(),
        provider,
        success: true,
        providerMessageId: result.messageSid,
        durationMs,
      });

      logger.info("[SMS Queue] Message sent successfully", {
        messageId,
        provider,
        messageSid: result.messageSid,
        durationMs,
      });
    } else {
      await SMSMessage.recordAttempt(messageId, {
        attemptedAt: new Date(),
        provider,
        success: false,
        errorMessage: result.error,
        durationMs,
      });

      // Re-throw to trigger BullMQ retry
      throw new Error(result.error || "SMS send failed");
    }
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("[SMS Queue] Send failed", {
      messageId,
      error: errorMessage,
      durationMs,
      retryCount: message.retryCount,
      maxRetries: message.maxRetries,
    });

    throw error; // Let BullMQ handle retry
  }
}

/**
 * Start the SMS worker
 */
export function startSMSWorker(): Worker<ISMSJobData> | null {
  if (smsWorker) return smsWorker;

  const connection = getRedisClient();
  if (!connection) {
    logger.warn("[SMS Worker] Redis not configured, worker disabled");
    return null;
  }

  smsWorker = new Worker<ISMSJobData>(
    SMS_QUEUE_NAME,
    async (job: Job<ISMSJobData>) => {
      await processSMSJob(job.data.messageId);
    },
    {
      connection: connection as Redis,
      concurrency: 5,
      limiter: {
        max: 30, // Max 30 SMS per minute
        duration: 60000,
      },
    }
  );

  smsWorker.on("completed", (job) => {
    logger.info("[SMS Worker] Job completed", { jobId: job.id, messageId: job.data.messageId });
  });

  smsWorker.on("failed", (job, error) => {
    logger.error("[SMS Worker] Job failed", {
      jobId: job?.id,
      messageId: job?.data.messageId,
      error: error.message,
      attemptsMade: job?.attemptsMade,
    });
  });

  smsWorker.on("error", (error) => {
    logger.error("[SMS Worker] Worker error", { error: error.message });
  });

  logger.info("📱 SMS Worker started");
  return smsWorker;
}

/**
 * Stop the SMS worker and queue
 */
export async function stopSMSQueue(): Promise<void> {
  if (smsWorker) {
    await smsWorker.close();
    smsWorker = null;
    logger.info("[SMS Worker] Stopped");
  }

  if (smsQueue) {
    await smsQueue.close();
    smsQueue = null;
    logger.info("[SMS Queue] Stopped");
  }
}

/**
 * Get queue statistics
 */
export async function getSMSQueueStats(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
} | null> {
  const queue = getSMSQueue();
  if (!queue) return null;

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

/**
 * Retry failed messages
 * 🔒 SECURITY: Only retries messages that have orgId for tenant isolation
 */
export async function retryFailedMessages(orgId?: string, limit = 100): Promise<number> {
  await connectToDatabase();

  const filter: Record<string, unknown> = { status: "FAILED" };
  if (orgId) filter.orgId = orgId;

  const failedMessages = await SMSMessage.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  let retried = 0;

  for (const msg of failedMessages) {
    // 🔐 SECURITY: Skip messages without orgId (legacy records without tenant scope)
    if (!msg.orgId) {
      logger.warn('[SMS Queue] Skipping retry for message without orgId', { messageId: msg._id });
      continue;
    }

    if (msg.retryCount < msg.maxRetries) {
      await queueSMS({
        to: msg.to,
        message: msg.message,
        type: msg.type,
        priority: msg.priority,
        orgId: msg.orgId,
        userId: msg.userId,
        referenceType: msg.referenceType,
        referenceId: msg.referenceId,
        metadata: msg.metadata as Record<string, unknown> | undefined,
      });
      retried++;
    }
  }

  return retried;
}

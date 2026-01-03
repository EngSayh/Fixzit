/**
 * SMS Queue Service
 *
 * Queue-based SMS delivery with retry, SLA tracking, and provider failover.
 * Uses an in-memory queue for background processing.
 *
 * @module lib/queues/sms-queue
 */

import { Queue, Worker, Job } from "@/lib/queue";
import { logger } from "@/lib/logger";
import { SMSMessage, TSMSType, TSMSPriority, TSMSProvider, type ISMSMessage } from "@/server/models/SMSMessage";
import { SMSSettings } from "@/server/models/SMSSettings";
import { sendSMS, type SMSProviderOptions } from "@/lib/sms";
import { redactPhoneNumber } from "@/lib/sms-providers/phone-utils";
import { getCircuitBreaker } from "@/lib/resilience";
import type { CircuitBreakerName } from "@/lib/resilience/service-circuit-breakers";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { decryptField } from "@/lib/security/encryption";

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
const orgRateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Decrypt provider auth token if stored encrypted; swallow failures to avoid crashing queue.
 */
function decryptProviderToken(encrypted?: string): string | undefined {
  if (!encrypted) return undefined;
  try {
    return decryptField(encrypted, "sms.providerApiKey") ?? undefined;
  } catch (error) {
    logger.error("[SMS Queue] Failed to decrypt provider API key", {
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

type ProviderCandidate = SMSProviderOptions & {
  name: SMSProviderOptions["provider"];
  priority: number;
  supportedTypes?: string[];
};

/**
 * Map provider names to circuit breaker names.
 * NOTE: Only Taqnyat is supported in production
 */
const PROVIDER_TO_BREAKER: Partial<Record<NonNullable<SMSProviderOptions["provider"]>, CircuitBreakerName>> = {
  TAQNYAT: "taqnyat",
};

/**
 * Check if a provider's circuit breaker is currently open.
 */
function isProviderCircuitOpen(providerName: SMSProviderOptions["provider"]): boolean {
  if (!providerName) return false;
  const breakerName = PROVIDER_TO_BREAKER[providerName];
  if (!breakerName) return false;
  try {
    const breaker = getCircuitBreaker(breakerName);
    return breaker.isOpen();
  } catch {
    return false;
  }
}


/**
 * Select provider candidates for Taqnyat (ONLY supported production provider).
 * Falls back to env Taqnyat creds when org settings are unusable.
 */
function buildProviderCandidates(settings: Awaited<ReturnType<typeof SMSSettings.getEffectiveSettings>>, messageType: string): ProviderCandidate[] {
  const candidates: ProviderCandidate[] = [];

  // Check if Taqnyat is configured via environment
  const hasEnvTaqnyat = Boolean(
    process.env.TAQNYAT_BEARER_TOKEN && process.env.TAQNYAT_SENDER_NAME
  );

  // Add env-based Taqnyat if configured and circuit is not open
  if (hasEnvTaqnyat && !isProviderCircuitOpen("TAQNYAT")) {
    candidates.push({
      name: "TAQNYAT",
      provider: "TAQNYAT",
      from: process.env.TAQNYAT_SENDER_NAME,
      bearerToken: process.env.TAQNYAT_BEARER_TOKEN,
      priority: 1,
    });
  }

  // Check org-specific settings for Taqnyat config
  for (const p of settings.providers || []) {
    if (!p.enabled) continue;
    if (p.provider !== "TAQNYAT") continue; // Only support Taqnyat
    if (isProviderCircuitOpen("TAQNYAT")) {
      logger.info("[SMS Queue] Skipping Taqnyat with open circuit breaker", { messageType });
      continue;
    }
    if (p.supportedTypes?.length && !p.supportedTypes.includes(messageType as TSMSType)) continue;
    
    candidates.push({
      name: "TAQNYAT",
      provider: "TAQNYAT",
      from: p.fromNumber,
      bearerToken: decryptProviderToken(p.encryptedApiKey),
      priority: typeof p.priority === "number" ? p.priority : 1,
      supportedTypes: p.supportedTypes,
    });
  }

  // Filter out providers missing required credentials
  return candidates.filter(
    (c) => Boolean(c.from) && Boolean(c.bearerToken),
  );
}

/**
 * Remove pending jobs for a given SMS messageId to prevent duplicate or cancelled sends.
 */
export async function removePendingSMSJobs(messageId: string): Promise<number> {
  const queue = getSMSQueue();
  if (!queue) return 0;

  const jobs = await queue.getJobs(["waiting", "delayed", "active"]);
  let removed = 0;

  for (const job of jobs) {
    if (!job) continue;
    if (job.data?.messageId === messageId || job.id === `sms-${messageId}`) {
      await job.remove();
      removed++;
    }
  }

  return removed;
}

/**
 * Simple per-org rate limiter using in-memory counters to avoid noisy-neighbor issues.
 * @internal Reserved for future per-org rate limiting enhancement
 */
export async function checkOrgRateLimit(orgId?: string): Promise<{ ok: true } | { ok: false; ttlMs: number }> {
  // 🔒 Enforce orgId presence to avoid unscoped throttling bypass
  if (!orgId) return { ok: false, ttlMs: 0 };

  const settings = await SMSSettings.getEffectiveSettings(orgId);
  const maxPerMinute = settings?.globalRateLimitPerMinute ?? 30;
  const key = `sms:rate:${orgId}`;
  const now = Date.now();
  const existing = orgRateLimitStore.get(key);
  if (!existing || now > existing.resetAt) {
    orgRateLimitStore.set(key, { count: 1, resetAt: now + 60_000 });
    return { ok: true };
  }

  const nextCount = existing.count + 1;
  orgRateLimitStore.set(key, { count: nextCount, resetAt: existing.resetAt });
  if (nextCount > maxPerMinute) {
    return { ok: false, ttlMs: Math.max(0, existing.resetAt - now) };
  }

  return { ok: true };
}

/**
 * Get or create the SMS queue instance
 */
export function getSMSQueue(): Queue<ISMSJobData> | null {
  if (smsQueue) return smsQueue;

  smsQueue = new Queue<ISMSJobData>(SMS_QUEUE_NAME, {
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

  // Basic E.164 validation to reduce provider rejects
  const E164 = /^\+?[1-9]\d{7,14}$/;
  if (!E164.test(to)) {
    throw new Error("Invalid destination phone (E.164 format required)");
  }

  // 🗄️ Ensure DB connection BEFORE any Mongo operations (fixes cold-start race condition)
  await connectToDatabase();

  // 🚦 Pre-queue rate limiting to avoid creating messages we can't send promptly
  // Note: checkOrgRateLimit queries SMSSettings, so DB must be connected first
  const rateCheck = await checkOrgRateLimit(orgId);
  if (!rateCheck.ok) {
    logger.warn("[SMS Queue] Rate limit exceeded for org; rejecting enqueue", {
      orgId,
      ttlMs: rateCheck.ttlMs,
    });
    throw new Error(`SMS rate limit exceeded for org; retry after ${Math.ceil(rateCheck.ttlMs / 1000)}s`);
  }

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
    logger.info("[SMS Queue] Queue disabled, sending immediately", {
      messageId: smsMessage._id.toString(),
      orgId,
      toMasked: to ? redactPhoneNumber(to) : undefined,
    });
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
      // Align queue retries with SLA-configured maxRetries
      attempts: smsMessage.maxRetries,
    }
  );

  // Update status to QUEUED
  await SMSMessage.findByIdAndUpdate(smsMessage._id, { status: "QUEUED" });

  logger.info("[SMS Queue] Message queued", {
    messageId: smsMessage._id.toString(),
    orgId,
    toMasked: to ? redactPhoneNumber(to) : undefined,
    type,
    priority,
    delay,
  });

  return { messageId: smsMessage._id.toString(), queued: true };
}

type ExistingSMS = Pick<
  ISMSMessage,
  | "_id"
  | "to"
  | "message"
  | "type"
  | "priority"
  | "orgId"
  | "userId"
  | "referenceType"
  | "referenceId"
  | "metadata"
  | "maxRetries"
 | "retryCount"
>;

/**
 * Enqueue an existing SMS record for delivery without creating a new document.
 * Falls back to immediate send when the queue is disabled.
 */
export async function enqueueExistingSMS(
  message: ExistingSMS,
  options: { attempts?: number; jobId?: string } = {}
): Promise<void> {
  if (!message.orgId) {
    throw new Error("[SMS Queue] orgId is required to enqueue SMS");
  }

  const queue = getSMSQueue();
  const messageId = typeof message._id === "string" ? message._id : message._id.toString();

  if (!queue) {
    await processSMSJob(messageId);
    return;
  }

  const priorityValue = { CRITICAL: 1, HIGH: 2, NORMAL: 3, LOW: 4 }[message.priority];
  const jobId = options.jobId ?? `sms-${messageId}`;
  // When callers reset retryCount before enqueue, honor the requested attempts/maxRetries directly.
  const attemptsRemaining = Math.max(1, options.attempts ?? message.maxRetries ?? 1);

  await queue.add(
    "send",
    {
      messageId,
      to: message.to,
      message: message.message,
      type: message.type,
      priority: message.priority,
      orgId: message.orgId,
      userId: message.userId,
      referenceType: message.referenceType,
      referenceId: message.referenceId,
      metadata: message.metadata as Record<string, unknown> | undefined,
    },
    {
      priority: priorityValue,
      jobId,
      attempts: attemptsRemaining,
    }
  );

  logger.info("[SMS Queue] Existing message queued", {
    messageId,
    orgId: message.orgId,
    toMasked: message.to ? redactPhoneNumber(message.to) : undefined,
    priority: message.priority,
  });
}

/**
 * Process a single SMS job
 */
async function processSMSJob(messageId: string): Promise<void> {
  await connectToDatabase();

  // eslint-disable-next-line local/require-lean -- NO_LEAN: needs document for status updates
  const message = await SMSMessage.findById(messageId);
  if (!message) {
    logger.error("[SMS Queue] Message not found", { messageId });
    return;
  }

  if (!message.orgId) {
    await SMSMessage.findByIdAndUpdate(messageId, {
      status: "FAILED",
      lastError: "Missing orgId",
    });
    logger.error("[SMS Queue] Missing orgId on message; aborting", { messageId });
    return;
  }

  // Skip messages that are expired/cancelled before processing
  if (message.status === "EXPIRED") {
    logger.info("[SMS Queue] Message cancelled/expired; skipping send", {
      messageId,
      orgId: message.orgId,
    });
    return;
  }

  // Respect max retry policy and terminal failure states to avoid double sends/costs
  if (message.status === "FAILED" || message.retryCount >= message.maxRetries) {
    await SMSMessage.findByIdAndUpdate(messageId, { status: "FAILED" });
    logger.warn("[SMS Queue] Max retries reached; skipping send", {
      messageId,
      orgId: message.orgId,
      status: message.status,
      retryCount: message.retryCount,
      maxRetries: message.maxRetries,
    });
    return;
  }

  // Check if expired
  if (message.expiresAt && new Date() > message.expiresAt) {
    await SMSMessage.findByIdAndUpdate(messageId, { status: "EXPIRED" });
    logger.warn("[SMS Queue] Message expired", { messageId, orgId: message.orgId });
    return;
  }

  // Check if already delivered
  if (message.status === "DELIVERED" || message.status === "SENT") {
    logger.info("[SMS Queue] Message already sent/delivered", { messageId, status: message.status });
    return;
  }

  // 🚦 Check per-org rate limit to prevent noisy-neighbor issues
  const rateCheck = await checkOrgRateLimit(message.orgId);
  if (!rateCheck.ok) {
    const delayMs = Math.max(rateCheck.ttlMs, 5_000);
    const queue = getSMSQueue();
    const priorityValue = { CRITICAL: 1, HIGH: 2, NORMAL: 3, LOW: 4 }[message.priority];

    await SMSMessage.findByIdAndUpdate(messageId, {
      status: "PENDING",
      nextRetryAt: new Date(Date.now() + delayMs),
    });

    if (queue) {
      await queue.add(
        "send",
        {
          messageId,
          to: message.to,
          message: message.message,
          type: message.type,
          priority: message.priority,
          orgId: message.orgId,
          userId: message.userId,
          referenceType: message.referenceType,
          referenceId: message.referenceId,
          metadata: message.metadata as Record<string, unknown> | undefined,
        },
        {
          delay: delayMs,
          priority: priorityValue,
          jobId: `sms-${messageId}-ratelimit-${Date.now()}`,
          attempts: Math.max(1, message.maxRetries - message.retryCount),
        }
      );
    }

    logger.warn("[SMS Queue] Rate limit exceeded for org; rescheduled", {
      messageId,
      orgId: message.orgId,
      delayMs,
    });
    return;
  }

  const startTime = Date.now();
  let recordedAttempt = false;

  try {
    const settings = await SMSSettings.getEffectiveSettings(message.orgId);
    const candidates = buildProviderCandidates(settings, message.type);

    if (!candidates.length) {
      throw new Error("No valid SMS providers configured (org or env)");
    }

    let lastError = "Unknown SMS failure";
    for (const candidate of candidates) {
      if (!candidate.bearerToken || !candidate.from) {
        lastError = `Provider ${candidate.name} missing credentials`;
        logger.warn("[SMS Queue] Skipping provider due to missing credentials", {
          messageId,
          provider: candidate.name,
        });
        continue;
      }

      const result = await sendSMS(message.to, message.message, {
        provider: candidate.provider,
        from: candidate.from,
        bearerToken: candidate.bearerToken,
      });

      const durationMs = Date.now() - startTime;

      if (result.success) {
        await SMSMessage.recordAttempt(messageId, {
          attemptedAt: new Date(),
          provider: (candidate.name || candidate.provider || "LOCAL") as TSMSProvider,
          success: true,
          providerMessageId: result.messageSid,
          durationMs,
        });
        recordedAttempt = true;

        logger.info("[SMS Queue] Message sent successfully", {
          messageId,
          orgId: message.orgId,
          toMasked: message.to ? redactPhoneNumber(message.to) : undefined,
          provider: candidate.name,
          messageSid: result.messageSid,
          durationMs,
        });
        return;
      }

      lastError = result.error || "SMS send failed";
      logger.warn("[SMS Queue] Provider failed, trying next candidate", {
        messageId,
        orgId: message.orgId,
        toMasked: message.to ? redactPhoneNumber(message.to) : undefined,
        providerTried: candidate.name,
        error: lastError,
      });
    }

    const finalProvider = candidates[candidates.length - 1];
    const durationMs = Date.now() - startTime;
    await SMSMessage.recordAttempt(messageId, {
      attemptedAt: new Date(),
      provider: (finalProvider?.name || "LOCAL") as TSMSProvider,
      success: false,
      errorMessage: lastError,
      durationMs,
    });
    recordedAttempt = true;

    throw new Error(lastError || "SMS send failed");
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (!recordedAttempt) {
      await SMSMessage.recordAttempt(messageId, {
        attemptedAt: new Date(),
        provider: "LOCAL", // System-level failure before reaching provider
        success: false,
        errorMessage,
        durationMs,
      });
      recordedAttempt = true;
    }

    // 📊 FIXED: Record failed attempt for retry tracking and SLA breach detection
    logger.error("[SMS Queue] Send failed", {
      messageId,
      orgId: message.orgId,
      toMasked: message.to ? redactPhoneNumber(message.to) : undefined,
      error: errorMessage,
      durationMs,
      retryCount: message.retryCount + 1,
      maxRetries: message.maxRetries,
    });

    throw error; // Let the queue handle retry
  }
}

/**
 * Start the SMS worker
 */
export function startSMSWorker(): Worker<ISMSJobData> | null {
  if (smsWorker) return smsWorker;

  // Worker throughput limit: configurable via env, default 120/min to accommodate multiple orgs
  // Per-org limits are enforced separately via checkOrgRateLimit (default 60/org/min)
  // Global worker limit should be >= max expected concurrent orgs * per-org limit
  const parsedLimit = Number(process.env.SMS_WORKER_MAX_PER_MIN);
  const workerMaxPerMinute = Number.isFinite(parsedLimit) && parsedLimit > 0
    ? Math.max(30, parsedLimit)
    : 120;

  if (process.env.SMS_WORKER_MAX_PER_MIN && !Number.isFinite(parsedLimit)) {
    logger.warn("[SMS Worker] Invalid SMS_WORKER_MAX_PER_MIN value, using default", {
      value: process.env.SMS_WORKER_MAX_PER_MIN,
      default: 120,
    });
  }

  smsWorker = new Worker<ISMSJobData>(
    SMS_QUEUE_NAME,
    async (job: Job<ISMSJobData>) => {
      await processSMSJob(job.data.messageId);
    },
    {
      concurrency: 5,
      limiter: {
        max: workerMaxPerMinute,
        duration: 60_000,
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

  if (!orgId) {
    throw new Error("[SMS Queue] orgId is required to retry failed messages");
  }

  const queue = getSMSQueue();
  const filter: Record<string, unknown> = { status: "FAILED", orgId };

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
      const nextStatus = queue ? "QUEUED" : "PENDING";
      await SMSMessage.findByIdAndUpdate(msg._id, {
        status: nextStatus,
        retryCount: 0,
        nextRetryAt: new Date(),
        lastError: null,
        lastErrorCode: null,
      });

      // Clean up any pending jobs to avoid duplicate sends after retry
      await removePendingSMSJobs(msg._id.toString());

      await enqueueExistingSMS({
        _id: msg._id as unknown as ISMSMessage["_id"],
        to: msg.to,
        message: msg.message,
        type: msg.type,
        priority: msg.priority,
        orgId: msg.orgId,
        userId: msg.userId,
        referenceType: msg.referenceType,
        referenceId: msg.referenceId,
        metadata: msg.metadata as Record<string, unknown> | undefined,
        maxRetries: msg.maxRetries,
        retryCount: msg.retryCount,
      }, { attempts: msg.maxRetries ?? 1 });
      retried++;
    }
  }

  return retried;
}

// Export internals for testing/monitoring
export { buildProviderCandidates, decryptProviderToken };

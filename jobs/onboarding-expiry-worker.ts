import { Worker, Job } from 'bullmq';
import IORedis, { type RedisOptions } from 'ioredis';
import { connectMongo } from '@/lib/mongo';
import { logger } from '@/lib/logger';
import { VerificationDocument, type VerificationDocumentDoc } from '@/server/models/onboarding/VerificationDocument';
import { VerificationLog } from '@/server/models/onboarding/VerificationLog';
import { OnboardingCase } from '@/server/models/onboarding/OnboardingCase';
import { Types } from 'mongoose';

/**
 * Job payload type for expiry processing
 * - orgId: Required for tenant-scoped processing (multi-tenant isolation)
 * - onboardingCaseId: Optional for case-specific processing
 */
type ExpiryJob = {
  orgId: string;
  onboardingCaseId?: string;
};

// Constants for system actor (auditability requirement)
const SYSTEM_ACTOR_ID = new Types.ObjectId('000000000000000000000000');

// Batch size for bulk operations (prevents memory exhaustion)
const BATCH_SIZE = 500;

// Resolution order: BULLMQ_REDIS_URL → REDIS_URL → REDIS_KEY (Vercel/GitHub naming)
const redisUrl = process.env.BULLMQ_REDIS_URL || process.env.REDIS_URL || process.env.REDIS_KEY;

/**
 * Build IORedis connection with security validation
 * 
 * SECURITY: In non-development environments, enforce TLS for Redis connections
 * to prevent plaintext credential/traffic exposure in shared/VPC setups.
 * 
 * - rediss:// URLs automatically use TLS
 * - redis:// URLs in production are logged as warnings and TLS is forced
 * - Local/development redis:// URLs are allowed without TLS
 */
function buildRedisConnection(): IORedis | null {
  if (!redisUrl) {
    return null;
  }
  
  const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  const isSecureUrl = redisUrl.startsWith('rediss://');
  const isLocalhost = redisUrl.includes('localhost') || redisUrl.includes('127.0.0.1');
  
  // In production, warn if using non-TLS Redis (unless localhost for local dev/test)
  if (!isDev && !isSecureUrl && !isLocalhost) {
    logger.warn('[OnboardingExpiry] Redis URL is not using TLS (rediss://). Adding TLS config for security.', {
      hint: 'Consider using rediss:// URL for encrypted connections',
    });
  }
  
  // Build connection options with proper typing
  const options: RedisOptions = {
    maxRetriesPerRequest: null, // Required for BullMQ
  };
  
  // Force TLS in production for non-secure URLs (unless localhost)
  if (!isDev && !isSecureUrl && !isLocalhost) {
    options.tls = {}; // Enable TLS with default settings
  }
  
  return new IORedis(redisUrl, options);
}

const connection = buildRedisConnection();

const QUEUE_NAME = process.env.EXPIRY_QUEUE_NAME || 'onboarding-expiry';

/**
 * Process document expiries for a specific organization
 * 
 * Multi-tenant isolation: Scopes queries via OnboardingCase.orgId
 * Performance: Uses batched bulk updates instead of per-doc saves
 * Auditability: Uses SYSTEM_ACTOR_ID for performed_by_id
 * 
 * CRITICAL FIX: Only expire documents where expiry_date <= NOW (not 30 days ahead!)
 * The previous implementation expired documents 30 days before their actual expiry.
 * 
 * PERFORMANCE FIX: Stream case IDs using cursor to prevent memory exhaustion for large tenants
 * Previous implementation loaded ALL case IDs at once, causing memory spikes.
 */
async function processOrgExpiries(orgId: string, onboardingCaseId?: string): Promise<number> {
  const now = new Date();
  // CRITICAL FIX: Expire documents that have ACTUALLY expired (expiry_date <= now)
  // NOT documents that will expire in 30 days
  const expiryThreshold = now; // Documents expired as of right now

  // Step 1: Build filter for onboarding cases
  const caseFilter: Record<string, unknown> = { orgId: new Types.ObjectId(orgId) };
  if (onboardingCaseId) {
    caseFilter._id = new Types.ObjectId(onboardingCaseId);
  }

  // PERFORMANCE FIX: Stream case IDs using cursor instead of loading all at once
  // This prevents memory exhaustion for large tenants with tens of thousands of cases
  let totalProcessed = 0;
  let caseIds: Types.ObjectId[] = [];
  
  const cursor = OnboardingCase.find(caseFilter).select('_id').cursor({ batchSize: BATCH_SIZE });
  
  for await (const caseDoc of cursor) {
    caseIds.push(caseDoc._id);
    
    // Process documents when we've collected a full batch of case IDs
    if (caseIds.length >= BATCH_SIZE) {
      const batchCount = await processDocumentBatch(caseIds, expiryThreshold, orgId, now);
      totalProcessed += batchCount;
      caseIds = []; // Reset for next batch
    }
  }
  
  // Process remaining case IDs (partial batch)
  if (caseIds.length > 0) {
    const batchCount = await processDocumentBatch(caseIds, expiryThreshold, orgId, now);
    totalProcessed += batchCount;
  }

  if (totalProcessed === 0) {
    logger.info('[OnboardingExpiry] No expiring documents found for org', { orgId });
  }

  return totalProcessed;
}

/**
 * Process a batch of documents for the given case IDs
 * Handles document expiration and audit logging
 */
async function processDocumentBatch(
  caseIds: Types.ObjectId[],
  expiryThreshold: Date,
  orgId: string,
  now: Date
): Promise<number> {
  let batchProcessed = 0;

  // Process documents in sub-batches to prevent memory exhaustion
  while (true) {
    // CRITICAL FIX: Find documents that are VERIFIED and ACTUALLY expired (expiry_date <= now)
    // Previously this used threshold = now + 30 days, which expired documents 30 days early!
    const expiringDocs = await VerificationDocument.find({
      status: 'VERIFIED',
      expiry_date: { $lte: expiryThreshold }, // Documents that have actually expired
      onboarding_case_id: { $in: caseIds },
    })
      .limit(BATCH_SIZE)
      .select('_id')
      .lean<Pick<VerificationDocumentDoc, '_id'>[]>();

    if (expiringDocs.length === 0) {
      break;
    }

    const docIds = expiringDocs.map(d => d._id);

    // Bulk update all documents in batch
    await VerificationDocument.updateMany(
      { _id: { $in: docIds } },
      { $set: { status: 'EXPIRED' } }
    );

    // Bulk insert verification logs for audit trail
    const logEntries = docIds.map(docId => ({
      document_id: docId,
      action: 'STATUS_CHANGE' as const,
      performed_by_id: SYSTEM_ACTOR_ID,
      details: {
        to: 'EXPIRED',
        reason: 'Auto-expired by worker (document expiry date reached)',
        orgId,
      },
      timestamp: now,
    }));

    await VerificationLog.insertMany(logEntries);

    batchProcessed += expiringDocs.length;

    // If we got less than batch size, we're done with this case batch
    if (expiringDocs.length < BATCH_SIZE) {
      break;
    }
  }

  return batchProcessed;
}

function buildWorker(): Worker<ExpiryJob> | null {
  if (!connection) {
    logger.warn('[OnboardingExpiry] Redis not configured; worker disabled');
    return null;
  }

  return new Worker<ExpiryJob>(
    QUEUE_NAME,
    async (job: Job<ExpiryJob>) => {
      await connectMongo();

      const { orgId, onboardingCaseId } = job.data;

      // Validate orgId is provided (tenant isolation requirement)
      if (!orgId || typeof orgId !== 'string' || orgId.trim() === '') {
        logger.error('[OnboardingExpiry] Job missing required orgId - skipping to prevent cross-tenant access', {
          jobId: job.id,
          jobData: job.data,
        });
        return; // Don't throw - just skip malformed jobs
      }

      const trimmedOrgId = orgId.trim();

      // Validate orgId is a valid ObjectId to prevent crash in processOrgExpiries
      if (!Types.ObjectId.isValid(trimmedOrgId)) {
        logger.error('[OnboardingExpiry] Invalid ObjectId format for orgId - skipping malformed job', {
          jobId: job.id,
          providedOrgId: orgId,
        });
        return; // Don't throw - just skip malformed jobs
      }

      const count = await processOrgExpiries(trimmedOrgId, onboardingCaseId);

      logger.info('[OnboardingExpiry] Processed expiring documents', {
        orgId,
        onboardingCaseId: onboardingCaseId || 'all',
        count,
        jobId: job.id,
      });
    },
    {
      connection,
      concurrency: 5, // Allow parallel processing of different org jobs
    },
  );
}

export function startOnboardingExpiryWorker(): Worker<ExpiryJob> | null {
  return buildWorker();
}

if (require.main === module) {
  const worker = startOnboardingExpiryWorker();
  if (worker) {
    logger.info('[OnboardingExpiry] Worker started', { queue: QUEUE_NAME });
  } else {
    // eslint-disable-next-line no-console
    logger.error('onboarding_expiry:worker_not_started', {
      reason: 'Redis connection missing',
    });
    process.exit(1);
  }
}

import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
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
const connection = redisUrl
  ? new IORedis(redisUrl, { maxRetriesPerRequest: null })
  : null;

const QUEUE_NAME = process.env.EXPIRY_QUEUE_NAME || 'onboarding-expiry';

/**
 * Process document expiries for a specific organization
 * 
 * Multi-tenant isolation: Scopes queries via OnboardingCase.orgId
 * Performance: Uses batched bulk updates instead of per-doc saves
 * Auditability: Uses SYSTEM_ACTOR_ID for performed_by_id
 */
async function processOrgExpiries(orgId: string, onboardingCaseId?: string): Promise<number> {
  const now = new Date();
  const threshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days ahead

  // Step 1: Find all onboarding cases for this org to get their IDs
  const caseFilter: Record<string, unknown> = { orgId: new Types.ObjectId(orgId) };
  if (onboardingCaseId) {
    caseFilter._id = new Types.ObjectId(onboardingCaseId);
  }

  const cases = await OnboardingCase.find(caseFilter).select('_id').lean();
  const caseIds = cases.map(c => c._id);

  if (caseIds.length === 0) {
    logger.info('[OnboardingExpiry] No onboarding cases found for org', { orgId });
    return 0;
  }

  let totalProcessed = 0;

  // Step 2: Process in batches to prevent memory exhaustion
  while (true) {
    // Find documents that are VERIFIED, expiring, and belong to this org's cases
    const expiringDocs = await VerificationDocument.find({
      status: 'VERIFIED',
      expiry_date: { $lte: threshold },
      onboarding_case_id: { $in: caseIds },
    })
      .limit(BATCH_SIZE)
      .select('_id')
      .lean<Pick<VerificationDocumentDoc, '_id'>[]>();

    if (expiringDocs.length === 0) {
      break; // No more documents to process
    }

    const docIds = expiringDocs.map(d => d._id);

    // Step 3: Bulk update all documents in batch
    await VerificationDocument.updateMany(
      { _id: { $in: docIds } },
      { $set: { status: 'EXPIRED' } }
    );

    // Step 4: Bulk insert verification logs for audit trail
    const logEntries = docIds.map(docId => ({
      document_id: docId,
      action: 'STATUS_CHANGE' as const,
      performed_by_id: SYSTEM_ACTOR_ID,
      details: {
        to: 'EXPIRED',
        reason: 'Auto-expired by worker (document expiry date reached)',
        orgId, // Include for audit traceability
      },
      timestamp: now,
    }));

    await VerificationLog.insertMany(logEntries);

    totalProcessed += expiringDocs.length;

    // If we got less than batch size, we're done
    if (expiringDocs.length < BATCH_SIZE) {
      break;
    }
  }

  return totalProcessed;
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

      const count = await processOrgExpiries(orgId.trim(), onboardingCaseId);

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

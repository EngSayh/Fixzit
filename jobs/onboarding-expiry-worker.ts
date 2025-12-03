import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { connectMongo } from '@/lib/mongo';
import { logger } from '@/lib/logger';
import { VerificationDocument } from '@/server/models/onboarding/VerificationDocument';
import { VerificationLog } from '@/server/models/onboarding/VerificationLog';

type ExpiryJob = { onboardingCaseId: string };

// Support REDIS_URL or REDIS_KEY (Vercel/GitHub naming convention)
const redisUrl = process.env.REDIS_URL || process.env.REDIS_KEY;
const connection = redisUrl
  ? new IORedis(redisUrl, { maxRetriesPerRequest: null })
  : null;

const QUEUE_NAME = process.env.EXPIRY_QUEUE_NAME || 'onboarding-expiry';

function buildWorker(): Worker<ExpiryJob> | null {
  if (!connection) {
    logger.warn('[OnboardingExpiry] Redis not configured; worker disabled');
    return null;
  }

  return new Worker<ExpiryJob>(
    QUEUE_NAME,
    async (_job: Job<ExpiryJob>) => {
      await connectMongo();
      const now = new Date();
      const threshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const expiringDocs = await VerificationDocument.find({
        status: 'VERIFIED',
        expiry_date: { $lte: threshold },
      });

      for (const doc of expiringDocs) {
        doc.status = 'EXPIRED';
        await doc.save();
        await VerificationLog.create({
          document_id: doc._id,
          action: 'STATUS_CHANGE',
          performed_by_id: undefined,
          details: { to: 'EXPIRED', reason: 'Auto-expired by worker' },
        });
      }

      logger.info('[OnboardingExpiry] Processed expiring documents', { count: expiringDocs.length });
    },
    { connection },
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

import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import mongoose from 'mongoose';
import { logger } from '@/lib/logger';
import { SouqRMA } from '@/server/models/souq/RMA';

type FinanceReviewJob = { rmaId: string; orgId: string };

// Resolution order: BULLMQ_REDIS_URL → REDIS_URL → REDIS_KEY (Vercel/GitHub naming)
const redisUrl =
  process.env.BULLMQ_REDIS_URL || process.env.REDIS_URL || process.env.REDIS_KEY;
const connection = redisUrl
  ? new IORedis(redisUrl, { maxRetriesPerRequest: null })
  : null;

const QUEUE_NAME = process.env.REFUNDS_QUEUE_NAME || 'souq:refunds';

const buildOrgFilter = (orgId: string | mongoose.Types.ObjectId) => {
  const orgString = typeof orgId === 'string' ? orgId : orgId?.toString?.();
  const candidates: Array<string | mongoose.Types.ObjectId> = [];
  if (orgString) {
    const trimmed = orgString.trim();
    candidates.push(trimmed);
    if (mongoose.Types.ObjectId.isValid(trimmed)) {
      candidates.push(new mongoose.Types.ObjectId(trimmed));
    }
  }
  return candidates.length ? { orgId: { $in: candidates } } : { orgId };
};

async function ensureMongo() {
  if (mongoose.connection.readyState === 1) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('[RefundsWorker] MONGODB_URI not configured');
  }
  await mongoose.connect(uri);
}

function buildWorker(): Worker<FinanceReviewJob> | null {
  if (!connection) {
    logger.warn('[RefundsWorker] Redis not configured; worker disabled');
    return null;
  }

  return new Worker<FinanceReviewJob>(
    QUEUE_NAME,
    async (job: Job<FinanceReviewJob>) => {
      await ensureMongo();
      const { rmaId, orgId } = job.data;

      const rma = await SouqRMA.findOneAndUpdate(
        { _id: rmaId, ...buildOrgFilter(orgId) },
        {
          $set: {
            'refund.status': 'pending_finance_review',
            'refund.reviewQueuedAt': new Date(),
          },
          $push: {
            timeline: {
              status: 'pending_finance_review',
              timestamp: new Date(),
              note: 'Auto-inspected return awaiting finance review',
              performedBy: 'SYSTEM',
            },
          },
        },
        { new: true },
      );

      if (!rma) {
        logger.warn('[RefundsWorker] RMA not found for finance review', {
          rmaId,
          orgId,
          jobId: job.id,
        });
        return;
      }

      logger.info('[RefundsWorker] Queued finance review for RMA', {
        rmaId: rma._id.toString(),
        orgId,
        jobId: job.id,
      });
    },
    { connection },
  );
}

export function startRefundsReviewWorker(): Worker<FinanceReviewJob> | null {
  return buildWorker();
}

if (require.main === module) {
  const worker = startRefundsReviewWorker();
  if (worker) {
    logger.info('[RefundsWorker] Worker started', { queue: QUEUE_NAME });
  } else {
    // eslint-disable-next-line no-console
    logger.error('refunds_review:worker_not_started', {
      reason: 'Redis connection missing',
    });
    process.exit(1);
  }
}

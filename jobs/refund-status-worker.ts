import { Worker, type Job } from '@/lib/queue';
import { logger } from '@/lib/logger';
import { RefundProcessor } from '@/services/souq/claims/refund-processor';
import { QUEUE_NAMES } from '@/lib/queues/setup';

type RefundStatusJob = { refundId: string; orgId: string };


function buildWorker(): Worker<RefundStatusJob> | null {
  return new Worker<RefundStatusJob>(
    QUEUE_NAMES.REFUNDS,
    async (job: Job<RefundStatusJob>) => {
      // Only handle status-check jobs; let other handlers pick up other names
      if (job.name !== 'souq-claim-refund-status-check') {
        logger.debug?.('[RefundStatusWorker] Skipping unrelated job', {
          jobName: job.name,
          jobId: job.id,
        });
        return;
      }

      const { refundId, orgId } = job.data;
      await RefundProcessor.processStatusCheckJob(refundId, orgId);
    }
  );
}

export function startRefundStatusWorker(): Worker<RefundStatusJob> | null {
  return buildWorker();
}

if (require.main === module) {
  const worker = startRefundStatusWorker();
  if (worker) {
    logger.info('[RefundStatusWorker] Worker started', { queue: QUEUE_NAMES.REFUNDS });
  } else {
    // eslint-disable-next-line no-console
    console.error('refund-status:worker_not_started', { reason: 'worker initialization failed' });
    process.exit(1);
  }
}


import { createWorker, QUEUE_NAMES } from '@/lib/queues/setup';
import { logger } from '@/lib/logger';
import { RefundProcessor } from '@/services/souq/claims/refund-processor';

type RefundRetryJob = {
  refundId: string;
};

// Start a dedicated worker to process delayed refund retries
createWorker<RefundRetryJob>(
  QUEUE_NAMES.REFUNDS,
  async (job) => {
    const { refundId } = job.data;
    if (!refundId) {
      throw new Error('Missing refundId for retry job');
    }

    logger.info('[Refunds] Processing retry job', { refundId, jobId: job.id });
    await RefundProcessor.processRetryJob(refundId);
  },
  3
);

import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { connectMongo } from '@/lib/mongo';
import { logger } from '@/lib/logger';
import { VerificationDocument } from '@/models/onboarding/VerificationDocument';
import { VerificationLog } from '@/models/onboarding/VerificationLog';

type OcrJob = { docId: string; onboardingCaseId: string };

const connection = process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
  : null;

const QUEUE_NAME = process.env.OCR_QUEUE_NAME || 'onboarding-ocr';

function buildWorker(): Worker<OcrJob> | null {
  if (!connection) {
    logger.warn('[OnboardingOCR] Redis not configured; worker disabled');
    return null;
  }

  return new Worker<OcrJob>(
    QUEUE_NAME,
    async (job: Job<OcrJob>) => {
      await connectMongo();
      const doc = await VerificationDocument.findById(job.data.docId);
      if (!doc) {
        logger.warn('[OnboardingOCR] Document not found', { jobId: job.id, docId: job.data.docId });
        return;
      }

      // Simulated OCR result placeholder; replace with real provider integration
      doc.ocr_confidence = 0.9;
      doc.ocr_data = { extracted_text: 'OCR placeholder', fields: {} };
      doc.status = 'UNDER_REVIEW';
      await doc.save();

      await VerificationLog.create({
        document_id: doc._id,
        action: 'AUTO_CHECK',
        performed_by_id: undefined,
        details: { jobId: job.id, confidence: doc.ocr_confidence },
      });

      logger.info('[OnboardingOCR] Processed document', { jobId: job.id, docId: doc._id.toString() });
    },
    { connection },
  );
}

export function startOnboardingOcrWorker(): Worker<OcrJob> | null {
  return buildWorker();
}

if (require.main === module) {
  const worker = startOnboardingOcrWorker();
  if (worker) {
    logger.info('[OnboardingOCR] Worker started', { queue: QUEUE_NAME });
  } else {
    // eslint-disable-next-line no-console
    logger.error('onboarding_ocr:worker_not_started', {
      reason: 'Redis connection missing',
    });
    process.exit(1);
  }
}

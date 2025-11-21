import { logger } from '@/lib/logger';
import { getDatabase } from '@/lib/mongodb-unified';
import { ObjectId } from 'mongodb';

export type JobType = 'email-invitation' | 'email-notification' | 's3-cleanup' | 'report-generation';

export interface Job {
  _id: ObjectId;
  type: JobType;
  payload: Record<string, unknown>;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
}

const COLLECTION = 'background_jobs';
const MAX_ATTEMPTS = 3;

/**
 * Background Job Queue Service
 * 
 * Simple in-database job queue for background tasks
 * Jobs are processed by worker endpoints or scheduled jobs
 */
export class JobQueue {
  /**
   * Enqueue a new background job
   */
  static async enqueue(type: JobType, payload: Record<string, unknown>, maxAttempts = MAX_ATTEMPTS): Promise<string> {
    try {
      const db = await getDatabase();
      const collection = db.collection<Job>(COLLECTION);

      const job: Job = {
        _id: new ObjectId(),
        type,
        payload,
        status: 'queued',
        attempts: 0,
        maxAttempts,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await collection.insertOne(job);
      logger.info('Job enqueued', { jobId: job._id.toString(), type });
      
      return job._id.toString();
    } catch (error) {
      logger.error('Failed to enqueue job', error as Error, { type, payload });
      throw error;
    }
  }

  /**
   * Claim a job for processing (atomic operation)
   */
  static async claimJob(type?: JobType): Promise<Job | null> {
    try {
      const db = await getDatabase();
      const collection = db.collection<Job>(COLLECTION);

      const query: Record<string, unknown> = {
        status: 'queued',
        $expr: {
          $lt: [
            '$attempts',
            { $ifNull: ['$maxAttempts', MAX_ATTEMPTS] }
          ]
        },
      };

      if (type) {
        query.type = type;
      }

      const result = await collection.findOneAndUpdate(
        query,
        {
          $set: { status: 'processing', updatedAt: new Date() },
          $inc: { attempts: 1 },
        },
        {
          sort: { createdAt: 1 },
          returnDocument: 'after',
        }
      );

      return result || null;
    } catch (error) {
      logger.error('Failed to claim job', error as Error);
      return null;
    }
  }

  /**
   * Mark a job as completed
   */
  static async completeJob(jobId: string): Promise<void> {
    try {
      const db = await getDatabase();
      const collection = db.collection<Job>(COLLECTION);

      await collection.updateOne(
        { _id: new ObjectId(jobId) },
        {
          $set: {
            status: 'completed',
            processedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      logger.info('Job completed', { jobId });
    } catch (error) {
      logger.error('Failed to complete job', error as Error, { jobId });
    }
  }

  /**
   * Mark a job as failed
   */
  static async failJob(jobId: string, error: string): Promise<void> {
    try {
      const db = await getDatabase();
      const collection = db.collection<Job>(COLLECTION);

      const job = await collection.findOne({ _id: new ObjectId(jobId) });
      
      if (!job) {
        logger.warn('Job not found for failure update', { jobId });
        return;
      }

      // If max attempts reached, mark as failed permanently
      // Otherwise, set back to queued for retry
      const status = job.attempts >= job.maxAttempts ? 'failed' : 'queued';

      await collection.updateOne(
        { _id: new ObjectId(jobId) },
        {
          $set: {
            status,
            error,
            updatedAt: new Date(),
            ...(status === 'failed' && { processedAt: new Date() }),
          },
        }
      );

      logger.error('Job failed', new Error(error), { jobId, attempts: job.attempts, status });
    } catch (error) {
      logger.error('Failed to update failed job', error as Error, { jobId });
    }
  }

  /**
   * Retry stuck jobs that have been processing for too long
   */
  static async retryStuckJobs(timeoutMinutes = 10): Promise<number> {
    try {
      const db = await getDatabase();
      const collection = db.collection<Job>(COLLECTION);

      const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);

      const result = await collection.updateMany(
        {
          status: 'processing',
          updatedAt: { $lt: cutoffTime },
          $expr: {
            $lt: [
              '$attempts',
              { $ifNull: ['$maxAttempts', MAX_ATTEMPTS] }
            ]
          },
        },
        {
          $set: {
            status: 'queued',
            updatedAt: new Date(),
          },
        }
      );

      if (result.modifiedCount > 0) {
        logger.info('Retried stuck jobs', { count: result.modifiedCount });
      }

      return result.modifiedCount;
    } catch (error) {
      logger.error('Failed to retry stuck jobs', error as Error);
      return 0;
    }
  }

  /**
   * Get job statistics
   */
  static async getStats(): Promise<{
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  }> {
    try {
      const db = await getDatabase();
      const collection = db.collection<Job>(COLLECTION);

      const [queued, processing, completed, failed, total] = await Promise.all([
        collection.countDocuments({ status: 'queued' }),
        collection.countDocuments({ status: 'processing' }),
        collection.countDocuments({ status: 'completed' }),
        collection.countDocuments({ status: 'failed' }),
        collection.countDocuments(),
      ]);

      return { queued, processing, completed, failed, total };
    } catch (error) {
      logger.error('Failed to get job stats', error as Error);
      return { queued: 0, processing: 0, completed: 0, failed: 0, total: 0 };
    }
  }

  /**
   * Clean up old completed jobs
   */
  static async cleanupOldJobs(daysOld = 30): Promise<number> {
    try {
      const db = await getDatabase();
      const collection = db.collection<Job>(COLLECTION);

      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      const result = await collection.deleteMany({
        status: { $in: ['completed', 'failed'] },
        updatedAt: { $lt: cutoffDate },
      });

      if (result.deletedCount > 0) {
        logger.info('Cleaned up old jobs', { count: result.deletedCount });
      }

      return result.deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old jobs', error as Error);
      return 0;
    }
  }
}

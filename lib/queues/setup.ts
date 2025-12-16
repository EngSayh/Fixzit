/**
 * BullMQ Queue Setup - Background job processing
 * @module lib/queues/setup
 */

import { Queue, Worker, QueueEvents, type Job, type Processor } from 'bullmq';
import type Redis from 'ioredis';
import { getRedisClient } from '@/lib/redis';
import { logger } from '@/lib/logger';

// Queue names
export const QUEUE_NAMES = {
  BUY_BOX_RECOMPUTE: 'souq:buybox-recompute',
  AUTO_REPRICER: 'souq:auto-repricer',
  SETTLEMENT: 'souq:settlement',
  REFUNDS: 'souq:refunds',
  INVENTORY_HEALTH: 'souq:inventory-health',
  ADS_AUCTION: 'souq:ads-auction',
  POLICY_SWEEP: 'souq:policy-sweep',
  SEARCH_INDEX: 'souq:search-index',
  ACCOUNT_HEALTH: 'souq:account-health',
  NOTIFICATIONS: 'souq:notifications',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// Queue instances registry
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const queues = new Map<QueueName, Queue<any>>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const workers = new Map<QueueName, Worker<any, any>>();
const queueEvents = new Map<QueueName, QueueEvents>();

function requireRedisConnection(context: string): Redis {
  const connection = getRedisClient();
  if (!connection) {
    throw new Error(`[Queues] Redis not configured (${context}). Set REDIS_URL or REDIS_KEY to enable BullMQ queues.`);
  }
  return connection;
}

/**
 * Get or create a queue instance
 */
export function getQueue(name: QueueName): Queue {
  if (!queues.has(name)) {
    const connection = requireRedisConnection(`queue:${name}`);
    
    const queue = new Queue(name, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep completed jobs for 24 hours
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
      },
    });

    queues.set(name, queue);
    
    logger.info(`📬 Queue created: ${name}`);
  }

  return queues.get(name)!;
}

/**
 * Create a worker for a queue
 */
export function createWorker<T = unknown, R = unknown>(
  name: QueueName,
  processor: Processor<T, R>,
  concurrency = 1
): Worker {
  if (workers.has(name)) {
    logger.warn(`Worker for ${name} already exists, returning existing worker`);
    return workers.get(name)!;
  }

  const connection = requireRedisConnection(`worker:${name}`);

  const worker = new Worker<T, R>(name, processor, {
    connection,
    concurrency,
    limiter: {
      max: 10, // Max 10 jobs per duration
      duration: 1000, // 1 second
    },
  });

  // Worker event handlers
  worker.on('completed', (job: Job<T, R>) => {
    logger.info(`✅ Job completed`, {
      queue: name,
      jobId: job.id,
      duration: job.finishedOn ? job.finishedOn - (job.processedOn || 0) : 0,
    });
  });

  worker.on('failed', (job: Job<T, R> | undefined, error: Error) => {
    logger.error(`❌ Job failed`, {
      queue: name,
      jobId: job?.id,
      error: error.message,
      attempts: job?.attemptsMade,
    });
  });

  worker.on('error', (error: Error) => {
    logger.error(`Worker error on ${name}`, { error });
  });

  worker.on('stalled', (jobId: string) => {
    logger.warn(`Job stalled`, { queue: name, jobId });
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  workers.set(name, worker as Worker<any, any>);
  
  logger.info(`👷 Worker started: ${name} (concurrency: ${concurrency})`);

  return worker;
}

/**
 * Create queue events listener
 */
export function createQueueEvents(name: QueueName): QueueEvents {
  if (queueEvents.has(name)) {
    return queueEvents.get(name)!;
  }

  const connection = requireRedisConnection(`events:${name}`);

  const events = new QueueEvents(name, { connection });

  events.on('waiting', ({ jobId }) => {
    logger.debug(`Job waiting`, { queue: name, jobId });
  });

  events.on('active', ({ jobId }) => {
    logger.debug(`Job active`, { queue: name, jobId });
  });

  events.on('progress', ({ jobId, data }) => {
    logger.debug(`Job progress`, { queue: name, jobId, progress: data });
  });

  queueEvents.set(name, events);

  return events;
}

/**
 * Add a job to a queue
 */
export async function addJob<T>(
  queueName: QueueName,
  jobName: string,
  data: T,
  options?: {
    delay?: number;
    priority?: number;
    jobId?: string;
    repeat?: {
      pattern?: string; // Cron pattern
      every?: number; // Milliseconds
    };
  }
): Promise<Job<T>> {
  const queue = getQueue(queueName);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const job = await queue.add(jobName, data as any, options);

  logger.info(`📝 Job added`, {
    queue: queueName,
    jobName,
    jobId: job.id,
    delay: options?.delay,
    repeat: options?.repeat,
  });

  return job;
}

/**
 * Get job counts for a queue
 */
export async function getQueueStats(name: QueueName): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}> {
  const queue = getQueue(name);

  const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
    queue.getJobCountByTypes('paused'),
  ]);

  return { waiting, active, completed, failed, delayed, paused };
}

/**
 * Pause a queue
 */
export async function pauseQueue(name: QueueName): Promise<void> {
  const queue = getQueue(name);
  await queue.pause();
  logger.info(`⏸️  Queue paused: ${name}`);
}

/**
 * Resume a queue
 */
export async function resumeQueue(name: QueueName): Promise<void> {
  const queue = getQueue(name);
  await queue.resume();
  logger.info(`▶️  Queue resumed: ${name}`);
}

/**
 * Clean old jobs from a queue
 */
export async function cleanQueue(
  name: QueueName,
  status: 'completed' | 'failed',
  ageMs: number
): Promise<number> {
  const queue = getQueue(name);
  const jobs = await queue.clean(ageMs, 1000, status);
  
  logger.info(`🧹 Queue cleaned`, {
    queue: name,
    status,
    count: jobs.length,
  });

  return jobs.length;
}

/**
 * Obliterate a queue (remove all jobs and metadata)
 */
export async function obliterateQueue(name: QueueName): Promise<void> {
  const queue = getQueue(name);
  await queue.obliterate();
  logger.warn(`💥 Queue obliterated: ${name}`);
}

/**
 * Gracefully close all queues and workers
 */
export async function closeAllQueues(): Promise<void> {
  logger.info('Closing all queues and workers...');

  // Close workers first
  for (const [name, worker] of workers.entries()) {
    await worker.close();
    logger.info(`Worker closed: ${name}`);
  }

  // Close queue events
  for (const [name, events] of queueEvents.entries()) {
    await events.close();
    logger.info(`Queue events closed: ${name}`);
  }

  // Close queues
  for (const [name, queue] of queues.entries()) {
    await queue.close();
    logger.info(`Queue closed: ${name}`);
  }

  queues.clear();
  workers.clear();
  queueEvents.clear();

  logger.info('✅ All queues and workers closed');
}

/**
 * Initialize all queues (call on app startup)
 */
export async function initializeQueues(): Promise<void> {
  logger.info('🚀 Initializing BullMQ queues...');

  // Create all queues
  Object.values(QUEUE_NAMES).forEach((name) => {
    getQueue(name);
  });

  logger.info(`✅ Initialized ${queues.size} queues`);
}

export default {
  getQueue,
  createWorker,
  createQueueEvents,
  addJob,
  getQueueStats,
  pauseQueue,
  resumeQueue,
  cleanQueue,
  obliterateQueue,
  closeAllQueues,
  initializeQueues,
  QUEUE_NAMES,
};

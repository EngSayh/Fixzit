/**
 * Analytics Increment Helper with Retry Logic
 * 
 * Provides a shared retry mechanism for incrementing analytics counters
 * across different models. Helps prevent duplicate retry logic across API routes.
 */

import { logger } from '@/lib/logger';
import type { Model, Types, UpdateQuery, Document } from 'mongoose';

interface IncrementOptions<T = unknown> {
  model: Model<T>;
  id: Types.ObjectId;
  updateOp: UpdateQuery<T>;
  entityType: string;
  maxRetries?: number;
  baseDelay?: number;
}

/**
 * Increment analytics with linear backoff retry
 * 
 * Uses a linear backoff strategy: baseDelay, baseDelay*2, baseDelay*3, etc.
 * This provides increasing delays on retries without the aggressive growth of exponential backoff.
 * 
 * @param options - Configuration for the increment operation
 * @returns Promise that resolves when increment succeeds or all retries are exhausted
 */
export async function incrementAnalyticsWithRetry<T extends Document>({
  model,
  id,
  updateOp,
  entityType,
  maxRetries = 3,
  baseDelay = 100,
}: IncrementOptions<T>): Promise<void> {
  let retries = maxRetries;
  
  while (retries > 0) {
    try {
      await model.findByIdAndUpdate(id, updateOp).exec();
      break; // Success - exit retry loop
    } catch (error) {
      retries--;
      
      if (retries === 0) {
        // Final failure - log error
        logger.error(`Failed to increment ${entityType} analytics after ${maxRetries} retries`, {
          id: id.toString(),
          message: error instanceof Error ? error.message : 'Unknown error',
          type: error instanceof Error ? error.constructor.name : typeof error,
        });
      } else {
        // Wait before retry with exponential backoff
        const delay = baseDelay * (maxRetries - retries);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

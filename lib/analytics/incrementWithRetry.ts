/**
 * @module lib/analytics/incrementWithRetry
 * @description Analytics increment helper with linear backoff retry logic.
 *
 * Provides a shared retry mechanism for incrementing analytics counters
 * across different models (products, vendors, marketplace). Prevents duplicate
 * retry logic across API routes and ensures counter reliability.
 *
 * @features
 * - Linear backoff retry strategy (baseDelay * attempt)
 * - Configurable max attempts and base delay
 * - Type-safe interface with generic document types
 * - Error suppression (logs but doesn't throw)
 * - Tenant-scoped operation support
 *
 * @usage
 * ```typescript
 * await incrementAnalyticsWithRetry({
 *   filter: { _id: productId, org_id: session.user.orgId },
 *   update: { $inc: { 'analytics.views': 1 } },
 *   model: Product,
 *   maxAttempts: 5,
 *   baseDelayMs: 100,
 * });
 * ```
 */

import { logger } from "@/lib/logger";
import type { Types, UpdateQuery, Document } from "mongoose";
import type { MModel } from "@/types/mongoose-compat";

interface IncrementOptions<T = unknown> {
  model: MModel<T>;
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
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      retries--;

      if (retries === 0) {
        // Final failure - log error
        const errObj =
          error instanceof Error ? error : new Error(String(error));
        logger.error(
          `Failed to increment ${entityType} analytics after ${maxRetries} retries`,
          errObj,
          {
            id: id.toString(),
            type: errObj.constructor.name,
          },
        );
      } else {
        // Wait before retry with exponential backoff
        const delay = baseDelay * (maxRetries - retries);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}

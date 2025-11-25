import { logger } from "@/lib/logger";

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  jitterRatio?: number;
  label?: string;
  shouldRetry?: (context: RetryContext) => boolean;
  onAttempt?: (context: RetryContext) => void;
}

export interface RetryContext {
  attempt: number;
  maxAttempts: number;
  lastError?: unknown;
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function executeWithRetry<T>(
  operation: (context: RetryContext) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 500,
    maxDelayMs = 15_000,
    backoffFactor = 2,
    jitterRatio = 0.2,
    label = "resilient-operation",
    shouldRetry,
    onAttempt,
  } = options;

  if (maxAttempts < 1) {
    throw new Error("maxAttempts must be at least 1");
  }

  let attempt = 0;
  let delay = baseDelayMs;
  let lastError: unknown;

  while (attempt < maxAttempts) {
    attempt += 1;
    const context: RetryContext = { attempt, maxAttempts, lastError };
    try {
      const result = await operation(context);
      onAttempt?.(context);
      return result;
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      lastError = error;
      context.lastError = error;
      onAttempt?.(context);

      const shouldRetryThisAttempt =
        attempt < maxAttempts && (shouldRetry ? shouldRetry(context) : true);

      if (!shouldRetryThisAttempt) {
        throw error;
      }

      const jitter = delay * jitterRatio * Math.random();
      const waitMs = Math.min(delay + jitter, maxDelayMs);

      logger.warn(
        `[Retry] ${label} failed (attempt ${attempt}/${maxAttempts})`,
        {
          component: "resilience.retry",
          action: "retry",
          error: error instanceof Error ? error.message : String(error),
        },
      );

      await wait(waitMs);
      delay = Math.min(delay * backoffFactor, maxDelayMs);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Retry attempts exhausted");
}

import { logger } from '@/lib/logger';
import { createTimeoutSignal } from '@/lib/resilience';
import type { CircuitBreaker } from '@/lib/resilience';

type FetchTarget = Parameters<typeof fetch>[0];
type FetchInit = NonNullable<Parameters<typeof fetch>[1]>;

export type FetchRetryContext = {
  attempt: number;
  maxAttempts: number;
  response?: Response;
  error?: Error;
};

export type FetchWithRetryOptions = {
  timeoutMs?: number;
  maxAttempts?: number;
  retryDelayMs?: number;
  backoffFactor?: number;
  jitterRatio?: number;
  shouldRetry?: (_context: FetchRetryContext) => boolean;
  onAttempt?: (_context: FetchRetryContext) => void;
  label?: string;
  circuitBreaker?: CircuitBreaker;
};

const defaultShouldRetry = (context: FetchRetryContext): boolean => {
  if (context.error) {
    return true;
  }
  const status = context.response?.status ?? 0;
  return status >= 500 || status === 429;
};

export async function fetchWithRetry(
  input: FetchTarget,
  init: FetchInit = {},
  options: FetchWithRetryOptions = {},
): Promise<Response> {
  const {
    timeoutMs = Number(process.env.PAYMENT_TIMEOUT_MS) || 15_000,
    maxAttempts = Number(process.env.PAYMENT_MAX_RETRIES) || 1,
    retryDelayMs = 1_000,
    backoffFactor = 2,
    jitterRatio = 0.2,
    shouldRetry = defaultShouldRetry,
    onAttempt,
    label,
    circuitBreaker,
  } = options;

  if (maxAttempts < 1) {
    throw new Error('maxAttempts must be at least 1');
  }

  let attempt = 0;
  let delayMs = retryDelayMs;
  let lastError: Error | undefined;
  let lastResponse: Response | undefined;

  while (attempt < maxAttempts) {
    attempt += 1;
    if (init.signal?.aborted) {
      throw init.signal.reason ?? new Error('Aborted before fetch started');
    }

    const timeout = createTimeoutSignal({
      timeoutMs,
      signal: init.signal ?? undefined,
      reason: `Fetch timeout (${timeoutMs}ms) exceeded`,
    });
    const timeoutSignal: AbortSignal | undefined = timeout.signal || undefined;

    try {
      const exec = () =>
        fetch(input, {
          ...init,
          signal: timeoutSignal || undefined,
        });

      const response = circuitBreaker
        ? await circuitBreaker.run(exec)
        : await exec();

      lastResponse = response;
      const context: FetchRetryContext = { attempt, maxAttempts, response };
      onAttempt?.(context);

      if (!shouldRetry(context) || attempt === maxAttempts) {
        return response;
      }
    } catch (_error) {
      const error = _error instanceof Error ? _error : new Error(String(_error));
      void error;
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err;
      const context: FetchRetryContext = { attempt, maxAttempts, error: err };
      onAttempt?.(context);

      if (attempt === maxAttempts || !shouldRetry(context)) {
        throw err;
      }

      logger.warn('[fetchWithRetry] transient failure', {
        label,
        attempt,
        maxAttempts,
        error: err.message,
      });
    } finally {
      timeout.dispose();
    }

    const jitter = delayMs * jitterRatio * Math.random();
    const waitTime = delayMs + jitter;
    await new Promise(resolve => setTimeout(resolve, waitTime));
    delayMs *= backoffFactor;
  }

  if (lastResponse) {
    return lastResponse;
  }

  throw lastError ?? new Error('fetchWithRetry failed without response');
}

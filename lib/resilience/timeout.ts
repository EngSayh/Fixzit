export interface TimeoutControllerOptions {
  timeoutMs: number;
  signal?: AbortSignal;
  reason?: string;
}

export interface TimeoutController {
  signal: AbortSignal;
  dispose: () => void;
}

/**
 * Creates an AbortSignal that auto-aborts after the provided timeout and
 * mirrors the lifecycle of an optional upstream signal.
 */
export function createTimeoutSignal({
  timeoutMs,
  signal: upstreamSignal,
  reason,
}: TimeoutControllerOptions): TimeoutController {
  const controller = new AbortController();

  if (upstreamSignal?.aborted) {
    controller.abort(upstreamSignal.reason);
  }

  const abortFromUpstream = () => {
    controller.abort(upstreamSignal?.reason);
  };

  if (upstreamSignal) {
    upstreamSignal.addEventListener('abort', abortFromUpstream, { once: true });
  }

  const timeoutId =
    timeoutMs > 0
      ? setTimeout(() => {
          controller.abort(
            reason
              ? new Error(reason)
              : new Error(`Operation timed out after ${timeoutMs}ms`),
          );
        }, timeoutMs)
      : null;

  return {
    signal: controller.signal,
    dispose: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (upstreamSignal) {
        upstreamSignal.removeEventListener('abort', abortFromUpstream);
      }
    },
  };
}

export async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: TimeoutControllerOptions,
): Promise<T> {
  const { signal, dispose } = createTimeoutSignal(options);

  let abortHandler: (() => void) | null = null;
  const abortPromise = new Promise<never>((_, reject) => {
    abortHandler = () => {
      signal.removeEventListener('abort', abortHandler!);
      reject(signal.reason ?? new Error('Operation aborted'));
    };

    if (signal.aborted) {
      abortHandler();
      return;
    }

    signal.addEventListener('abort', abortHandler!, { once: true });
  });

  try {
    return await Promise.race([operation(signal), abortPromise]);
  } finally {
    if (abortHandler) {
      signal.removeEventListener('abort', abortHandler);
    }
    dispose();
  }
}

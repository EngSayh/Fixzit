import { logger } from '@/lib/logger';

export class CircuitBreakerOpenError extends Error {
  constructor(public readonly breakerName: string, cooldownMs: number) {
    super(`Circuit breaker "${breakerName}" is open for another ${cooldownMs}ms`);
    this.name = 'CircuitBreakerOpenError';
  }
}

type BreakerState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number;
  successThreshold?: number;
  cooldownMs?: number;
}

export class CircuitBreaker {
  private state: BreakerState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private nextAttemptTimestamp = 0;

  constructor(private readonly options: CircuitBreakerOptions) {}

  private get failureThreshold(): number {
    return this.options.failureThreshold ?? 5;
  }

  private get successThreshold(): number {
    return this.options.successThreshold ?? 2;
  }

  private get cooldownMs(): number {
    return this.options.cooldownMs ?? 30_000;
  }

  async run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      const now = Date.now();
      if (now < this.nextAttemptTimestamp) {
        throw new CircuitBreakerOpenError(this.options.name, this.nextAttemptTimestamp - now);
      }
      this.state = 'half-open';
      logger.warn(`[CircuitBreaker] ${this.options.name} transitioning to half-open`, {
        component: 'circuit-breaker',
        action: 'half-open',
      });
    }

    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (_error) {
      const error = _error instanceof Error ? _error : new Error(String(_error));
      void error;
      this.recordFailure(error);
      throw error;
    }
  }

  private recordSuccess(): void {
    if (this.state === 'half-open') {
      this.successCount += 1;
      if (this.successCount >= this.successThreshold) {
        this.close();
      }
    } else if (this.state === 'closed') {
      this.failureCount = 0;
    }
  }

  private recordFailure(error: unknown): void {
    logger.warn(`[CircuitBreaker] ${this.options.name} recorded failure`, {
      component: 'circuit-breaker',
      action: 'failure',
      error: error instanceof Error ? error.message : String(error),
    });

    this.failureCount += 1;
    if (this.failureCount >= this.failureThreshold || this.state === 'half-open') {
      this.open();
    }
  }

  private open(): void {
    this.state = 'open';
    this.nextAttemptTimestamp = Date.now() + this.cooldownMs;
    this.successCount = 0;
    logger.error(`[CircuitBreaker] ${this.options.name} opened`, undefined, {
      component: 'circuit-breaker',
      action: 'open',
      cooldownMs: this.cooldownMs,
    });
  }

  private close(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    logger.info(`[CircuitBreaker] ${this.options.name} closed`, {
      component: 'circuit-breaker',
      action: 'close',
    });
  }
}

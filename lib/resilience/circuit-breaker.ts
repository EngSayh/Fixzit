import { logger } from "@/lib/logger";

export class CircuitBreakerOpenError extends Error {
  constructor(
    public readonly breakerName: string,
    cooldownMs: number,
  ) {
    super(
      `Circuit breaker "${breakerName}" is open for another ${cooldownMs}ms`,
    );
    this.name = "CircuitBreakerOpenError";
  }
}

type BreakerState = "closed" | "open" | "half-open";

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number;
  successThreshold?: number;
  cooldownMs?: number;
}

/**
 * Prometheus-compatible metrics for circuit breakers
 */
export interface CircuitBreakerMetrics {
  name: string;
  state: BreakerState;
  failureCount: number;
  successCount: number;
  totalCalls: number;
  totalFailures: number;
  totalSuccesses: number;
  lastStateChange: number;
  cooldownRemainingMs: number;
}

// Global registry for all circuit breakers
const circuitBreakerRegistry = new Map<string, CircuitBreaker>();

/**
 * Get metrics for all registered circuit breakers (Prometheus-compatible)
 */
export function getAllCircuitBreakerMetrics(): CircuitBreakerMetrics[] {
  return Array.from(circuitBreakerRegistry.values()).map((cb) => cb.getMetrics());
}

/**
 * Get metrics for a specific circuit breaker by name
 */
export function getCircuitBreakerMetrics(name: string): CircuitBreakerMetrics | null {
  const breaker = circuitBreakerRegistry.get(name);
  return breaker ? breaker.getMetrics() : null;
}

/**
 * Export metrics in Prometheus text format
 */
export function getPrometheusMetrics(): string {
  const metrics = getAllCircuitBreakerMetrics();
  const lines: string[] = [
    "# HELP circuit_breaker_state Current state of circuit breaker (0=closed, 1=half-open, 2=open)",
    "# TYPE circuit_breaker_state gauge",
  ];

  const stateMap: Record<BreakerState, number> = {
    closed: 0,
    "half-open": 1,
    open: 2,
  };

  for (const m of metrics) {
    lines.push(`circuit_breaker_state{name="${m.name}"} ${stateMap[m.state]}`);
  }

  lines.push(
    "# HELP circuit_breaker_failure_count Current failure count",
    "# TYPE circuit_breaker_failure_count gauge"
  );
  for (const m of metrics) {
    lines.push(`circuit_breaker_failure_count{name="${m.name}"} ${m.failureCount}`);
  }

  lines.push(
    "# HELP circuit_breaker_total_calls Total number of calls",
    "# TYPE circuit_breaker_total_calls counter"
  );
  for (const m of metrics) {
    lines.push(`circuit_breaker_total_calls{name="${m.name}"} ${m.totalCalls}`);
  }

  lines.push(
    "# HELP circuit_breaker_total_failures Total number of failures",
    "# TYPE circuit_breaker_total_failures counter"
  );
  for (const m of metrics) {
    lines.push(`circuit_breaker_total_failures{name="${m.name}"} ${m.totalFailures}`);
  }

  lines.push(
    "# HELP circuit_breaker_total_successes Total number of successes",
    "# TYPE circuit_breaker_total_successes counter"
  );
  for (const m of metrics) {
    lines.push(`circuit_breaker_total_successes{name="${m.name}"} ${m.totalSuccesses}`);
  }

  lines.push(
    "# HELP circuit_breaker_cooldown_remaining_ms Remaining cooldown time in milliseconds",
    "# TYPE circuit_breaker_cooldown_remaining_ms gauge"
  );
  for (const m of metrics) {
    lines.push(`circuit_breaker_cooldown_remaining_ms{name="${m.name}"} ${m.cooldownRemainingMs}`);
  }

  return lines.join("\n");
}

export class CircuitBreaker {
  private state: BreakerState = "closed";
  private failureCount = 0;
  private successCount = 0;
  private nextAttemptTimestamp = 0;
  private totalCalls = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private lastStateChange = Date.now();

  constructor(private readonly options: CircuitBreakerOptions) {
    // Register in global registry
    circuitBreakerRegistry.set(options.name, this);
  }

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
    this.totalCalls++;
    
    if (this.state === "open") {
      const now = Date.now();
      if (now < this.nextAttemptTimestamp) {
        throw new CircuitBreakerOpenError(
          this.options.name,
          this.nextAttemptTimestamp - now,
        );
      }
      this.state = "half-open";
      this.lastStateChange = Date.now();
      logger.warn(
        `[CircuitBreaker] ${this.options.name} transitioning to half-open`,
        {
          component: "circuit-breaker",
          action: "half-open",
        },
      );
    }

    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      this.recordFailure(error);
      throw error;
    }
  }

  private recordSuccess(): void {
    this.totalSuccesses++;
    if (this.state === "half-open") {
      this.successCount += 1;
      if (this.successCount >= this.successThreshold) {
        this.close();
      }
    } else if (this.state === "closed") {
      this.failureCount = 0;
    }
  }

  private recordFailure(error: unknown): void {
    this.totalFailures++;
    logger.warn(`[CircuitBreaker] ${this.options.name} recorded failure`, {
      component: "circuit-breaker",
      action: "failure",
      error: error instanceof Error ? error.message : String(error),
    });

    this.failureCount += 1;
    if (
      this.failureCount >= this.failureThreshold ||
      this.state === "half-open"
    ) {
      this.open();
    }
  }

  private open(): void {
    this.state = "open";
    this.nextAttemptTimestamp = Date.now() + this.cooldownMs;
    this.successCount = 0;
    this.lastStateChange = Date.now();
    logger.error(`[CircuitBreaker] ${this.options.name} opened`, undefined, {
      component: "circuit-breaker",
      action: "open",
      cooldownMs: this.cooldownMs,
    });
  }

  private close(): void {
    this.state = "closed";
    this.failureCount = 0;
    this.successCount = 0;
    this.lastStateChange = Date.now();
    logger.info(`[CircuitBreaker] ${this.options.name} closed`, {
      component: "circuit-breaker",
      action: "close",
    });
  }

  /**
   * Get current metrics for this circuit breaker (Prometheus-compatible)
   */
  getMetrics(): CircuitBreakerMetrics {
    const now = Date.now();
    return {
      name: this.options.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalCalls: this.totalCalls,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      lastStateChange: this.lastStateChange,
      cooldownRemainingMs:
        this.state === "open" ? Math.max(0, this.nextAttemptTimestamp - now) : 0,
    };
  }
}

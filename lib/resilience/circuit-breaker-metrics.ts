/**
 * Circuit Breaker Metrics Export
 * Provides Prometheus-compatible metrics for all service circuit breakers.
 * 
 * Metrics Format:
 * - circuit_breaker_state{name="..."} - 0=closed, 1=open, 2=half-open
 * - circuit_breaker_failures_total{name="..."}
 * - circuit_breaker_successes_total{name="..."}
 */

import { CircuitBreaker } from "./circuit-breaker";
import { serviceCircuitBreakers, CircuitBreakerName } from "./service-circuit-breakers";

export type CircuitBreakerState = "closed" | "open" | "half-open";

export interface CircuitBreakerMetrics {
  name: string;
  state: CircuitBreakerState;
  stateNumeric: 0 | 1 | 2; // 0=closed, 1=open, 2=half-open
  failureCount: number;
  successCount: number;
  cooldownMs: number;
  lastStateChange?: number;
}

/**
 * Get stats from a CircuitBreaker instance.
 * Uses reflection to access private state (for metrics only).
 */
function getBreakerStats(breaker: CircuitBreaker): {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  cooldownMs: number;
} {
  // Access private fields via any cast (metrics-only, safe pattern)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = breaker as any;
  return {
    state: b.state ?? "closed",
    failureCount: b.failureCount ?? 0,
    successCount: b.successCount ?? 0,
    cooldownMs: b.options?.cooldownMs ?? b.cooldownMs ?? 30000,
  };
}

/**
 * Get metrics for all registered circuit breakers.
 */
export function getAllCircuitBreakerMetrics(): CircuitBreakerMetrics[] {
  const metrics: CircuitBreakerMetrics[] = [];

  for (const [name, breaker] of Object.entries(serviceCircuitBreakers)) {
    const stats = getBreakerStats(breaker);
    
    let stateNumeric: 0 | 1 | 2 = 0;
    if (stats.state === "open") stateNumeric = 1;
    else if (stats.state === "half-open") stateNumeric = 2;

    metrics.push({
      name: name as CircuitBreakerName,
      state: stats.state,
      stateNumeric,
      failureCount: stats.failureCount,
      successCount: stats.successCount,
      cooldownMs: stats.cooldownMs,
    });
  }

  return metrics;
}

/**
 * Export metrics in Prometheus text format.
 * 
 * Example output:
 * ```
 * # HELP circuit_breaker_state Current state of circuit breaker (0=closed, 1=open, 2=half-open)
 * # TYPE circuit_breaker_state gauge
 * circuit_breaker_state{name="paytabs"} 0
 * circuit_breaker_state{name="taqnyat"} 0
 * ...
 * ```
 */
export function getPrometheusMetrics(): string {
  const metrics = getAllCircuitBreakerMetrics();
  const lines: string[] = [];

  // State metric
  lines.push("# HELP circuit_breaker_state Current state (0=closed, 1=open, 2=half-open)");
  lines.push("# TYPE circuit_breaker_state gauge");
  for (const m of metrics) {
    lines.push(`circuit_breaker_state{name="${m.name}"} ${m.stateNumeric}`);
  }

  lines.push("");

  // Failure count
  lines.push("# HELP circuit_breaker_failures_total Total failure count");
  lines.push("# TYPE circuit_breaker_failures_total counter");
  for (const m of metrics) {
    lines.push(`circuit_breaker_failures_total{name="${m.name}"} ${m.failureCount}`);
  }

  lines.push("");

  // Success count
  lines.push("# HELP circuit_breaker_successes_total Total success count in half-open state");
  lines.push("# TYPE circuit_breaker_successes_total counter");
  for (const m of metrics) {
    lines.push(`circuit_breaker_successes_total{name="${m.name}"} ${m.successCount}`);
  }

  lines.push("");

  // Cooldown config
  lines.push("# HELP circuit_breaker_cooldown_ms Cooldown period in milliseconds");
  lines.push("# TYPE circuit_breaker_cooldown_ms gauge");
  for (const m of metrics) {
    lines.push(`circuit_breaker_cooldown_ms{name="${m.name}"} ${m.cooldownMs}`);
  }

  return lines.join("\n");
}

/**
 * Get a JSON summary of all circuit breakers.
 * Useful for health check endpoints.
 */
export function getCircuitBreakerSummary(): {
  total: number;
  open: number;
  closed: number;
  halfOpen: number;
  breakers: CircuitBreakerMetrics[];
} {
  const metrics = getAllCircuitBreakerMetrics();
  
  return {
    total: metrics.length,
    open: metrics.filter(m => m.state === "open").length,
    closed: metrics.filter(m => m.state === "closed").length,
    halfOpen: metrics.filter(m => m.state === "half-open").length,
    breakers: metrics,
  };
}

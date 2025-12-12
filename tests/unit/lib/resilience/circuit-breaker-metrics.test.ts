import { describe, it, expect } from "vitest";
import {
  getAllCircuitBreakerMetrics,
  getPrometheusMetrics,
  getCircuitBreakerSummary,
} from "@/lib/resilience/circuit-breaker-metrics";

describe("Circuit Breaker Metrics", () => {
  describe("getAllCircuitBreakerMetrics", () => {
    it("returns metrics for all registered breakers", () => {
      const metrics = getAllCircuitBreakerMetrics();

      expect(Array.isArray(metrics)).toBe(true);
      expect(metrics.length).toBeGreaterThan(0);

      // Check that each metric has required fields
      for (const m of metrics) {
        expect(m).toHaveProperty("name");
        expect(m).toHaveProperty("state");
        expect(m).toHaveProperty("stateNumeric");
        expect(m).toHaveProperty("failureCount");
        expect(m).toHaveProperty("successCount");
        expect(m).toHaveProperty("cooldownMs");
      }
    });

    it("returns valid state values", () => {
      const metrics = getAllCircuitBreakerMetrics();

      for (const m of metrics) {
        expect(["closed", "open", "half-open"]).toContain(m.state);
        expect([0, 1, 2]).toContain(m.stateNumeric);
      }
    });

    it("includes known circuit breakers", () => {
      const metrics = getAllCircuitBreakerMetrics();
      const names = metrics.map((m) => m.name);

      // Should include at least these service breakers (Taqnyat is ONLY SMS provider)
      expect(names).toContain("tap");
      expect(names).toContain("taqnyat");
      expect(names).toContain("meilisearch");
    });
  });

  describe("getPrometheusMetrics", () => {
    it("returns Prometheus text format", () => {
      const output = getPrometheusMetrics();

      expect(typeof output).toBe("string");
      expect(output).toContain("# HELP circuit_breaker_state");
      expect(output).toContain("# TYPE circuit_breaker_state gauge");
      expect(output).toContain("circuit_breaker_state{name=");
    });

    it("includes all metric types", () => {
      const output = getPrometheusMetrics();

      expect(output).toContain("circuit_breaker_failures_total");
      expect(output).toContain("circuit_breaker_successes_total");
      expect(output).toContain("circuit_breaker_cooldown_ms");
    });

    it("uses proper Prometheus metric format", () => {
      const output = getPrometheusMetrics();

      // Check metric format: name{label="value"} number
      const stateLines = output
        .split("\n")
        .filter((l) => l.startsWith("circuit_breaker_state{"));

      for (const line of stateLines) {
        // Should match pattern: circuit_breaker_state{name="xxx"} N
        expect(line).toMatch(/circuit_breaker_state\{name="[^"]+"\} \d+/);
      }
    });
  });

  describe("getCircuitBreakerSummary", () => {
    it("returns summary with counts", () => {
      const summary = getCircuitBreakerSummary();

      expect(summary).toHaveProperty("total");
      expect(summary).toHaveProperty("open");
      expect(summary).toHaveProperty("closed");
      expect(summary).toHaveProperty("halfOpen");
      expect(summary).toHaveProperty("breakers");

      expect(typeof summary.total).toBe("number");
      expect(typeof summary.open).toBe("number");
      expect(typeof summary.closed).toBe("number");
      expect(typeof summary.halfOpen).toBe("number");
    });

    it("counts add up correctly", () => {
      const summary = getCircuitBreakerSummary();

      expect(summary.open + summary.closed + summary.halfOpen).toBe(
        summary.total
      );
    });

    it("breakers array matches total count", () => {
      const summary = getCircuitBreakerSummary();

      expect(summary.breakers.length).toBe(summary.total);
    });
  });
});

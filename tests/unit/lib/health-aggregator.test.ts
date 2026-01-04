/**
 * @module tests/unit/lib/health-aggregator.test.ts
 * @description Unit tests for health aggregator (FEAT-0035)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock prom-client metrics before importing health-aggregator
vi.mock("@/lib/monitoring/metrics-registry", () => ({
  healthScoreGauge: { set: vi.fn() },
  componentHealthGauge: { labels: vi.fn(() => ({ set: vi.fn() })) },
  componentLatencyHistogram: { labels: vi.fn(() => ({ observe: vi.fn() })) },
  healthCheckCounter: { labels: vi.fn(() => ({ inc: vi.fn() })) },
}));

import {
  healthAggregator,
  HealthStatus,
  HealthComponents,
} from "@/lib/monitoring/health-aggregator";

describe("Health Aggregator (FEAT-0035)", () => {
  beforeEach(() => {
    healthAggregator.reset();
  });

  describe("report()", () => {
    it("should report healthy status for a component", () => {
      healthAggregator.report(HealthComponents.MONGODB, HealthStatus.HEALTHY, {
        latencyMs: 15,
      });

      const component = healthAggregator.getComponent(HealthComponents.MONGODB);
      expect(component).toBeDefined();
      expect(component?.status).toBe(HealthStatus.HEALTHY);
      expect(component?.latencyMs).toBe(15);
      expect(component?.consecutiveSuccesses).toBe(1);
      expect(component?.consecutiveFailures).toBe(0);
    });

    it("should track consecutive failures", () => {
      healthAggregator.report(HealthComponents.REDIS, HealthStatus.UNHEALTHY, {
        errorMessage: "Connection refused",
      });
      healthAggregator.report(HealthComponents.REDIS, HealthStatus.UNHEALTHY);
      healthAggregator.report(HealthComponents.REDIS, HealthStatus.UNHEALTHY);

      const component = healthAggregator.getComponent(HealthComponents.REDIS);
      expect(component?.consecutiveFailures).toBe(3);
      expect(component?.consecutiveSuccesses).toBe(0);
    });

    it("should reset failure count on success", () => {
      healthAggregator.report(HealthComponents.SMS, HealthStatus.UNHEALTHY);
      healthAggregator.report(HealthComponents.SMS, HealthStatus.UNHEALTHY);
      healthAggregator.report(HealthComponents.SMS, HealthStatus.HEALTHY);

      const component = healthAggregator.getComponent(HealthComponents.SMS);
      expect(component?.consecutiveFailures).toBe(0);
      expect(component?.consecutiveSuccesses).toBe(1);
    });
  });

  describe("getSummary()", () => {
    it("should return unknown status when no components registered", () => {
      const summary = healthAggregator.getSummary();
      expect(summary.overallStatus).toBe(HealthStatus.UNKNOWN);
      expect(summary.healthScore).toBe(0);
    });

    it("should return healthy when all components are healthy", () => {
      healthAggregator.report(HealthComponents.MONGODB, HealthStatus.HEALTHY);
      healthAggregator.report(HealthComponents.REDIS, HealthStatus.HEALTHY);
      healthAggregator.report(HealthComponents.SMS, HealthStatus.HEALTHY);

      const summary = healthAggregator.getSummary();
      expect(summary.overallStatus).toBe(HealthStatus.HEALTHY);
      expect(summary.healthScore).toBe(100);
    });

    it("should return degraded when any component is degraded", () => {
      healthAggregator.report(HealthComponents.MONGODB, HealthStatus.HEALTHY);
      healthAggregator.report(HealthComponents.REDIS, HealthStatus.DEGRADED);

      const summary = healthAggregator.getSummary();
      expect(summary.overallStatus).toBe(HealthStatus.DEGRADED);
      expect(summary.healthScore).toBe(75); // (100 + 50) / 2
    });

    it("should return unhealthy when any component is unhealthy", () => {
      healthAggregator.report(HealthComponents.MONGODB, HealthStatus.HEALTHY);
      healthAggregator.report(HealthComponents.REDIS, HealthStatus.UNHEALTHY);

      const summary = healthAggregator.getSummary();
      expect(summary.overallStatus).toBe(HealthStatus.UNHEALTHY);
      expect(summary.healthScore).toBe(50); // (100 + 0) / 2
    });

    it("should include uptime in summary", () => {
      const summary = healthAggregator.getSummary();
      expect(summary.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });
  });

  describe("isHealthy()", () => {
    it("should return true when all components healthy", () => {
      healthAggregator.report(HealthComponents.MONGODB, HealthStatus.HEALTHY);
      expect(healthAggregator.isHealthy()).toBe(true);
    });

    it("should return false when any component unhealthy", () => {
      healthAggregator.report(HealthComponents.MONGODB, HealthStatus.UNHEALTHY);
      expect(healthAggregator.isHealthy()).toBe(false);
    });
  });

  describe("getHistory()", () => {
    it("should record history entries on each report", () => {
      healthAggregator.report(HealthComponents.MONGODB, HealthStatus.HEALTHY);
      healthAggregator.report(HealthComponents.REDIS, HealthStatus.HEALTHY);
      healthAggregator.report(HealthComponents.SMS, HealthStatus.DEGRADED);

      const history = healthAggregator.getHistory();
      expect(history.length).toBe(3);
      expect(history[2].status).toBe(HealthStatus.DEGRADED);
    });

    it("should limit history to requested size", () => {
      for (let i = 0; i < 10; i++) {
        healthAggregator.report(HealthComponents.MONGODB, HealthStatus.HEALTHY);
      }

      const history = healthAggregator.getHistory(5);
      expect(history.length).toBe(5);
    });
  });

  describe("onStatusChange()", () => {
    it("should call handler when status changes", () => {
      const handler = vi.fn();
      healthAggregator.onStatusChange(handler);

      healthAggregator.report(HealthComponents.MONGODB, HealthStatus.HEALTHY);
      healthAggregator.report(HealthComponents.MONGODB, HealthStatus.UNHEALTHY);

      expect(handler).toHaveBeenCalledWith(
        HealthComponents.MONGODB,
        HealthStatus.UNKNOWN, // first report: unknown → healthy
        HealthStatus.HEALTHY
      );
      expect(handler).toHaveBeenCalledWith(
        HealthComponents.MONGODB,
        HealthStatus.HEALTHY,
        HealthStatus.UNHEALTHY
      );
    });

    it("should not call handler when status unchanged", () => {
      const handler = vi.fn();
      healthAggregator.onStatusChange(handler);

      healthAggregator.report(HealthComponents.MONGODB, HealthStatus.HEALTHY);
      healthAggregator.report(HealthComponents.MONGODB, HealthStatus.HEALTHY);

      // Only called once (unknown → healthy)
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("should allow unsubscribing", () => {
      const handler = vi.fn();
      const unsubscribe = healthAggregator.onStatusChange(handler);

      healthAggregator.report(HealthComponents.MONGODB, HealthStatus.HEALTHY);
      unsubscribe();
      healthAggregator.report(HealthComponents.MONGODB, HealthStatus.UNHEALTHY);

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe("HealthComponents", () => {
    it("should have standard component names", () => {
      expect(HealthComponents.MONGODB).toBe("mongodb");
      expect(HealthComponents.SMS).toBe("sms");
      expect(HealthComponents.EMAIL).toBe("email");
      expect(HealthComponents.S3).toBe("s3");
    });
  });
});

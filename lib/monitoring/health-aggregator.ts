/**
 * @module lib/monitoring/health-aggregator
 * @description Centralized health status aggregator for Fixzit services.
 * Collects and tracks health status from multiple components for monitoring integration.
 * 
 * FEAT-0035: Health monitoring integration
 * 
 * @features
 * - Track health status of multiple components (db, sms, email)
 * - Compute aggregate health score
 * - Track health history for trend analysis
 * - Emit events on status changes for alerting
 * - Prometheus metrics integration
 * - Thread-safe singleton pattern
 * 
 * @usage
 * ```typescript
 * import { healthAggregator, HealthStatus } from '@/lib/monitoring/health-aggregator';
 * 
 * // Report component health
 * healthAggregator.report('mongodb', HealthStatus.HEALTHY, { latencyMs: 15 });
 * 
 * // Get aggregate status
 * const summary = healthAggregator.getSummary();
 * console.log(summary.overallStatus); // 'healthy' | 'degraded' | 'unhealthy'
 * ```
 */

import { logger } from "@/lib/logger";
import {
  healthScoreGauge,
  componentHealthGauge,
  componentLatencyHistogram,
  healthCheckCounter,
} from "@/lib/monitoring/metrics-registry";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export enum HealthStatus {
  HEALTHY = "healthy",
  DEGRADED = "degraded",
  UNHEALTHY = "unhealthy",
  UNKNOWN = "unknown",
}

export interface ComponentHealth {
  status: HealthStatus;
  lastChecked: Date;
  latencyMs?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
}

export interface HealthSummary {
  overallStatus: HealthStatus;
  components: Record<string, ComponentHealth>;
  healthScore: number; // 0-100
  lastUpdated: Date;
  uptimeSeconds: number;
}

export interface HealthHistoryEntry {
  timestamp: Date;
  status: HealthStatus;
  healthScore: number;
}

type HealthChangeHandler = (
  component: string,
  oldStatus: HealthStatus,
  newStatus: HealthStatus
) => void;

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH AGGREGATOR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class HealthAggregator {
  private components: Map<string, ComponentHealth> = new Map();
  private history: HealthHistoryEntry[] = [];
  private maxHistorySize = 1000;
  private startTime: Date = new Date();
  private changeHandlers: Set<HealthChangeHandler> = new Set();

  /**
   * Report health status for a component
   */
  report(
    component: string,
    status: HealthStatus,
    metadata?: {
      latencyMs?: number;
      errorMessage?: string;
      extra?: Record<string, unknown>;
    }
  ): void {
    const existing = this.components.get(component);
    const oldStatus = existing?.status ?? HealthStatus.UNKNOWN;

    const health: ComponentHealth = {
      status,
      lastChecked: new Date(),
      latencyMs: metadata?.latencyMs,
      errorMessage: status !== HealthStatus.HEALTHY ? metadata?.errorMessage : undefined,
      metadata: metadata?.extra,
      consecutiveFailures:
        status === HealthStatus.HEALTHY
          ? 0
          : (existing?.consecutiveFailures ?? 0) + 1,
      consecutiveSuccesses:
        status === HealthStatus.HEALTHY
          ? (existing?.consecutiveSuccesses ?? 0) + 1
          : 0,
    };

    this.components.set(component, health);

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE PROMETHEUS METRICS (FEAT-0035)
    // ─────────────────────────────────────────────────────────────────────────
    
    // Update component health gauge
    const healthValue = status === HealthStatus.HEALTHY ? 1 
      : status === HealthStatus.DEGRADED ? 0.5 
      : 0;
    componentHealthGauge.labels(component).set(healthValue);
    
    // Record latency if provided
    if (metadata?.latencyMs !== undefined) {
      componentLatencyHistogram.labels(component).observe(metadata.latencyMs);
    }
    
    // Increment health check counter
    healthCheckCounter.labels(component, status).inc();
    
    // Update overall health score
    healthScoreGauge.set(this.computeHealthScore());

    // Emit change event if status changed
    if (oldStatus !== status) {
      logger.info(`[HealthAggregator] ${component}: ${oldStatus} → ${status}`, {
        latencyMs: metadata?.latencyMs,
        errorMessage: metadata?.errorMessage,
      });
      this.notifyHandlers(component, oldStatus, status);
    }

    // Record history entry
    this.recordHistory();
  }

  /**
   * Get health summary for all components
   */
  getSummary(): HealthSummary {
    const components: Record<string, ComponentHealth> = {};
    this.components.forEach((health, name) => {
      components[name] = { ...health };
    });

    const overallStatus = this.computeOverallStatus();
    const healthScore = this.computeHealthScore();

    return {
      overallStatus,
      components,
      healthScore,
      lastUpdated: new Date(),
      uptimeSeconds: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
    };
  }

  /**
   * Get health status for a specific component
   */
  getComponent(component: string): ComponentHealth | undefined {
    return this.components.get(component);
  }

  /**
   * Check if system is healthy overall
   */
  isHealthy(): boolean {
    return this.computeOverallStatus() === HealthStatus.HEALTHY;
  }

  /**
   * Get health history for trend analysis
   */
  getHistory(limit = 100): HealthHistoryEntry[] {
    return this.history.slice(-limit);
  }

  /**
   * Register handler for health status changes
   */
  onStatusChange(handler: HealthChangeHandler): () => void {
    this.changeHandlers.add(handler);
    return () => this.changeHandlers.delete(handler);
  }

  /**
   * Reset all health data (for testing)
   */
  reset(): void {
    this.components.clear();
    this.history = [];
    this.startTime = new Date();
    this.changeHandlers.clear();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ─────────────────────────────────────────────────────────────────────────────

  private computeOverallStatus(): HealthStatus {
    if (this.components.size === 0) {
      return HealthStatus.UNKNOWN;
    }

    let hasUnhealthy = false;
    let hasDegraded = false;

    for (const health of this.components.values()) {
      if (health.status === HealthStatus.UNHEALTHY) {
        hasUnhealthy = true;
      } else if (health.status === HealthStatus.DEGRADED) {
        hasDegraded = true;
      }
    }

    if (hasUnhealthy) return HealthStatus.UNHEALTHY;
    if (hasDegraded) return HealthStatus.DEGRADED;
    return HealthStatus.HEALTHY;
  }

  private computeHealthScore(): number {
    if (this.components.size === 0) return 0;

    let totalScore = 0;
    for (const health of this.components.values()) {
      switch (health.status) {
        case HealthStatus.HEALTHY:
          totalScore += 100;
          break;
        case HealthStatus.DEGRADED:
          totalScore += 50;
          break;
        case HealthStatus.UNHEALTHY:
          totalScore += 0;
          break;
        case HealthStatus.UNKNOWN:
          totalScore += 25;
          break;
      }
    }

    return Math.round(totalScore / this.components.size);
  }

  private recordHistory(): void {
    this.history.push({
      timestamp: new Date(),
      status: this.computeOverallStatus(),
      healthScore: this.computeHealthScore(),
    });

    // Trim history if too large
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }

  private notifyHandlers(
    component: string,
    oldStatus: HealthStatus,
    newStatus: HealthStatus
  ): void {
    for (const handler of this.changeHandlers) {
      try {
        handler(component, oldStatus, newStatus);
      } catch (error) {
        logger.error("[HealthAggregator] Handler error", { error });
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const healthAggregator = new HealthAggregator();

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT NAMES (standardized)
// ═══════════════════════════════════════════════════════════════════════════════

export const HealthComponents = {
  MONGODB: "mongodb",
  SMS: "sms",
  EMAIL: "email",
  S3: "s3",
  EXTERNAL_API: "external-api",
  JOB_QUEUE: "job-queue",
} as const;

/**
 * Alert Thresholds Configuration (PROC-006)
 *
 * Defines monitoring thresholds for proactive alerting.
 * Integrates with Sentry, OpenTelemetry, and health endpoints.
 *
 * @see lib/tracing.ts - OpenTelemetry integration
 * @see lib/monitoring/security-events.ts - Security event logging
 * @see app/api/health/ready/route.ts - Readiness probe
 */

import { logger } from '@/lib/logger';

// Severity levels for alerts
export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';

// Alert threshold configuration
export interface AlertThreshold {
  name: string;
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
  unit: string;
  severity: AlertSeverity;
  description: string;
  runbook?: string;
}

// Alert thresholds by category
export const ALERT_THRESHOLDS = {
  // Performance thresholds
  performance: [
    {
      name: 'High API Latency',
      metric: 'api.latency.p95',
      operator: 'gt' as const,
      value: 2000,
      unit: 'ms',
      severity: 'warning' as const,
      description: 'API P95 latency exceeds 2 seconds',
      runbook: 'docs/runbooks/high-latency.md',
    },
    {
      name: 'Critical API Latency',
      metric: 'api.latency.p99',
      operator: 'gt' as const,
      value: 5000,
      unit: 'ms',
      severity: 'critical' as const,
      description: 'API P99 latency exceeds 5 seconds',
      runbook: 'docs/runbooks/high-latency.md',
    },
    {
      name: 'High Memory Usage',
      metric: 'system.memory.usage',
      operator: 'gt' as const,
      value: 85,
      unit: '%',
      severity: 'warning' as const,
      description: 'Memory usage exceeds 85%',
      runbook: 'docs/runbooks/memory-pressure.md',
    },
    {
      name: 'Critical Memory Usage',
      metric: 'system.memory.usage',
      operator: 'gt' as const,
      value: 95,
      unit: '%',
      severity: 'critical' as const,
      description: 'Memory usage exceeds 95%',
      runbook: 'docs/runbooks/memory-pressure.md',
    },
  ],

  // Database thresholds
  database: [
    {
      name: 'Slow MongoDB Query',
      metric: 'mongodb.query.duration',
      operator: 'gt' as const,
      value: 1000,
      unit: 'ms',
      severity: 'warning' as const,
      description: 'MongoDB query takes longer than 1 second',
      runbook: 'docs/runbooks/slow-queries.md',
    },
    {
      name: 'MongoDB Connection Pool Exhausted',
      metric: 'mongodb.connections.available',
      operator: 'lt' as const,
      value: 5,
      unit: 'connections',
      severity: 'critical' as const,
      description: 'Less than 5 MongoDB connections available',
      runbook: 'docs/runbooks/connection-pool.md',
    },
    {
      name: 'High MongoDB Connection Usage',
      metric: 'mongodb.connections.usage',
      operator: 'gt' as const,
      value: 80,
      unit: '%',
      severity: 'warning' as const,
      description: 'MongoDB connection pool usage exceeds 80%',
      runbook: 'docs/runbooks/connection-pool.md',
    },
  ],

  // Error rate thresholds
  errors: [
    {
      name: 'High Error Rate',
      metric: 'http.error_rate',
      operator: 'gt' as const,
      value: 1,
      unit: '%',
      severity: 'warning' as const,
      description: 'HTTP 5xx error rate exceeds 1%',
      runbook: 'docs/runbooks/error-rate.md',
    },
    {
      name: 'Critical Error Rate',
      metric: 'http.error_rate',
      operator: 'gt' as const,
      value: 5,
      unit: '%',
      severity: 'critical' as const,
      description: 'HTTP 5xx error rate exceeds 5%',
      runbook: 'docs/runbooks/error-rate.md',
    },
    {
      name: 'Unhandled Exceptions Spike',
      metric: 'exceptions.unhandled.count',
      operator: 'gt' as const,
      value: 10,
      unit: 'count/min',
      severity: 'critical' as const,
      description: 'More than 10 unhandled exceptions per minute',
      runbook: 'docs/runbooks/exceptions.md',
    },
  ],

  // Security thresholds
  security: [
    {
      name: 'High Rate Limit Hits',
      metric: 'security.rate_limit.blocked',
      operator: 'gt' as const,
      value: 100,
      unit: 'count/min',
      severity: 'warning' as const,
      description: 'More than 100 requests blocked by rate limiting per minute',
      runbook: 'docs/runbooks/rate-limiting.md',
    },
    {
      name: 'Auth Failure Spike',
      metric: 'security.auth.failures',
      operator: 'gt' as const,
      value: 50,
      unit: 'count/min',
      severity: 'warning' as const,
      description: 'More than 50 authentication failures per minute',
      runbook: 'docs/runbooks/auth-failures.md',
    },
    {
      name: 'Potential Brute Force',
      metric: 'security.auth.failures.per_ip',
      operator: 'gt' as const,
      value: 10,
      unit: 'count/min',
      severity: 'critical' as const,
      description: 'Single IP has more than 10 auth failures per minute',
      runbook: 'docs/runbooks/brute-force.md',
    },
  ],

  // Business metrics
  business: [
    {
      name: 'Payment Processing Failures',
      metric: 'payment.failures',
      operator: 'gt' as const,
      value: 5,
      unit: '%',
      severity: 'critical' as const,
      description: 'Payment failure rate exceeds 5%',
      runbook: 'docs/runbooks/payment-failures.md',
    },
    {
      name: 'SMS Delivery Failures',
      metric: 'sms.delivery.failures',
      operator: 'gt' as const,
      value: 10,
      unit: '%',
      severity: 'warning' as const,
      description: 'SMS delivery failure rate exceeds 10%',
      runbook: 'docs/runbooks/sms-failures.md',
    },
    {
      name: 'Work Order SLA Breach',
      metric: 'workorder.sla.breached',
      operator: 'gt' as const,
      value: 5,
      unit: '%',
      severity: 'warning' as const,
      description: 'More than 5% of work orders breaching SLA',
      runbook: 'docs/runbooks/sla-breach.md',
    },
  ],

  // Infrastructure thresholds
  infrastructure: [
    {
      name: 'Health Check Failing',
      metric: 'health.ready',
      operator: 'eq' as const,
      value: 0,
      unit: 'boolean',
      severity: 'emergency' as const,
      description: 'Readiness probe failing',
      runbook: 'docs/runbooks/health-failing.md',
    },
    {
      name: 'High Request Queue',
      metric: 'http.queue.length',
      operator: 'gt' as const,
      value: 100,
      unit: 'requests',
      severity: 'warning' as const,
      description: 'Request queue exceeds 100 pending requests',
      runbook: 'docs/runbooks/request-queue.md',
    },
  ],
} as const;

/**
 * Check if a value violates a threshold
 */
export function checkThreshold(
  threshold: AlertThreshold,
  currentValue: number
): boolean {
  switch (threshold.operator) {
    case 'gt':
      return currentValue > threshold.value;
    case 'lt':
      return currentValue < threshold.value;
    case 'eq':
      return currentValue === threshold.value;
    case 'gte':
      return currentValue >= threshold.value;
    case 'lte':
      return currentValue <= threshold.value;
    default:
      return false;
  }
}

/**
 * Log an alert when threshold is violated
 */
export function triggerAlert(
  threshold: AlertThreshold,
  currentValue: number,
  context?: Record<string, unknown>
): void {
  const message = `ALERT [${threshold.severity.toUpperCase()}]: ${threshold.name}`;
  const details = {
    metric: threshold.metric,
    threshold: `${threshold.operator} ${threshold.value}${threshold.unit}`,
    currentValue: `${currentValue}${threshold.unit}`,
    description: threshold.description,
    runbook: threshold.runbook,
    ...context,
  };

  switch (threshold.severity) {
    case 'emergency':
    case 'critical':
      logger.error(message, details);
      break;
    case 'warning':
      logger.warn(message, details);
      break;
    default:
      logger.info(message, details);
  }
}

/**
 * Get all thresholds as flat array
 */
export function getAllThresholds(): AlertThreshold[] {
  return Object.values(ALERT_THRESHOLDS).flat();
}

/**
 * Get thresholds by category
 */
export function getThresholdsByCategory(
  category: keyof typeof ALERT_THRESHOLDS
): AlertThreshold[] {
  return [...ALERT_THRESHOLDS[category]];
}

/**
 * Get thresholds by severity
 */
export function getThresholdsBySeverity(
  severity: AlertSeverity
): AlertThreshold[] {
  return getAllThresholds().filter((t) => t.severity === severity);
}

export default ALERT_THRESHOLDS;

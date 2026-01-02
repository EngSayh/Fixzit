import client from "prom-client";

/**
 * Shared Prometheus registry for Fixzit metrics.
 * Collects default Node.js metrics once and exposes helpers for domain modules.
 * 
 * FEAT-0035: Enhanced with health monitoring integration
 */
export const metricsRegistry = new client.Registry();

if (process.env.PROM_METRICS_DISABLE_DEFAULTS !== "true") {
  client.collectDefaultMetrics({
    register: metricsRegistry,
    prefix: "fixzit_",
  });
}

export function getMetricsRegistry(): client.Registry {
  return metricsRegistry;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH MONITORING METRICS (FEAT-0035)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * System health score gauge (0-100)
 */
export const healthScoreGauge = new client.Gauge({
  name: "fixzit_health_score",
  help: "Overall system health score (0-100)",
  registers: [metricsRegistry],
});

/**
 * Component health status gauge
 * Labels: component (mongodb, redis, sms, email, etc.)
 * Values: 1 = healthy, 0.5 = degraded, 0 = unhealthy
 */
export const componentHealthGauge = new client.Gauge({
  name: "fixzit_component_health",
  help: "Health status per component (1=healthy, 0.5=degraded, 0=unhealthy)",
  labelNames: ["component"],
  registers: [metricsRegistry],
});

/**
 * Component latency histogram
 */
export const componentLatencyHistogram = new client.Histogram({
  name: "fixzit_component_latency_ms",
  help: "Component response latency in milliseconds",
  labelNames: ["component"],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  registers: [metricsRegistry],
});

/**
 * Health check counter
 */
export const healthCheckCounter = new client.Counter({
  name: "fixzit_health_checks_total",
  help: "Total health checks performed",
  labelNames: ["component", "status"],
  registers: [metricsRegistry],
});

/**
 * Uptime gauge (seconds)
 */
export const uptimeGauge = new client.Gauge({
  name: "fixzit_uptime_seconds",
  help: "Process uptime in seconds",
  registers: [metricsRegistry],
});

// Update uptime every 15 seconds
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    uptimeGauge.set(Math.floor(process.uptime()));
  }, 15_000);
}

import client from 'prom-client';

/**
 * Shared Prometheus registry for Fixzit metrics.
 * Collects default Node.js metrics once and exposes helpers for domain modules.
 */
export const metricsRegistry = new client.Registry();

if (process.env.PROM_METRICS_DISABLE_DEFAULTS !== 'true') {
  client.collectDefaultMetrics({
    register: metricsRegistry,
    prefix: 'fixzit_'
  });
}

export function getMetricsRegistry(): client.Registry {
  return metricsRegistry;
}

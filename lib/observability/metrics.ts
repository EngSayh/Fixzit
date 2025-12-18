/**
 * Application Metrics Collector
 * 
 * Lightweight metrics collection for monitoring application health.
 * Tracks counters, gauges, and histograms without heavy dependencies.
 * 
 * @module observability/metrics
 */

type MetricType = "counter" | "gauge" | "histogram";

interface MetricEntry {
  type: MetricType;
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp: number;
}

class MetricsCollector {
  private metrics: Map<string, MetricEntry> = new Map();
  private histograms: Map<string, number[]> = new Map();
  
  /**
   * Increment a counter
   * @example metrics.increment("api.requests", 1, { route: "/api/users", status: "200" })
   */
  increment(name: string, value: number = 1, tags?: Record<string, string>): void {
    const key = this.buildKey(name, tags);
    const existing = this.metrics.get(key);
    
    this.metrics.set(key, {
      type: "counter",
      name,
      value: (existing?.value ?? 0) + value,
      tags,
      timestamp: Date.now(),
    });
  }
  
  /**
   * Set a gauge value
   * @example metrics.gauge("db.connections", 42)
   */
  gauge(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.buildKey(name, tags);
    
    this.metrics.set(key, {
      type: "gauge",
      name,
      value,
      tags,
      timestamp: Date.now(),
    });
  }
  
  /**
   * Record a histogram value (for latencies, sizes, etc.)
   * @example metrics.histogram("api.latency", 234, { route: "/api/users" })
   */
  histogram(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.buildKey(name, tags);
    const values = this.histograms.get(key) ?? [];
    values.push(value);
    this.histograms.set(key, values);
    
    // Store summary stats as gauge
    const p95 = this.percentile(values, 0.95);
    const p99 = this.percentile(values, 0.99);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    
    this.metrics.set(key, {
      type: "histogram",
      name,
      value: avg,
      tags: { ...tags, p95: p95.toFixed(2), p99: p99.toFixed(2) },
      timestamp: Date.now(),
    });
  }
  
  /**
   * Get all metrics
   */
  getMetrics(): MetricEntry[] {
    return Array.from(this.metrics.values());
  }
  
  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.histograms.clear();
  }
  
  /**
   * Export metrics in Prometheus format
   */
  toPrometheus(): string {
    const lines: string[] = [];
    
    for (const metric of this.metrics.values()) {
      const tagsStr = metric.tags
        ? Object.entries(metric.tags)
            .map(([k, v]) => `${k}="${v}"`)
            .join(",")
        : "";
      
      lines.push(
        `${metric.name}${tagsStr ? `{${tagsStr}}` : ""} ${metric.value} ${metric.timestamp}`
      );
    }
    
    return lines.join("\n");
  }
  
  private buildKey(name: string, tags?: Record<string, string>): string {
    if (!tags) return name;
    const tagStr = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(",");
    return `${name}{${tagStr}}`;
  }
  
  private percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)] ?? 0;
  }
}

// Singleton instance
export const metrics = new MetricsCollector();

// Convenience functions
export const trackRateLimitHit = (route: string, status: number) => {
  metrics.increment("rate_limit.hits", 1, { route, status: status.toString() });
};

export const trackSSRFValidation = (result: "pass" | "fail", reason?: string) => {
  metrics.increment("ssrf.validations", 1, { result, reason: reason ?? "n/a" });
};

export const trackMongoSlowQuery = (collection: string, duration: number) => {
  if (duration > 1000) {
    // Only track slow queries (>1s)
    metrics.histogram("mongo.slow_query", duration, { collection });
  }
};

export const trackAPILatency = (route: string, method: string, duration: number, status: number) => {
  metrics.histogram("api.latency", duration, {
    route,
    method,
    status: status.toString(),
  });
};

import { logger } from '@/lib/logger';
/**
 * Performance Monitoring Middleware for Fixzit
 * 
 * Tracks page load times and ensures < 30 seconds target
 * Integrates with Next.js middleware for automatic monitoring
 * 
 * Usage: Import in middleware.ts or individual pages
 */

import { NextRequest, NextResponse } from 'next/server';

export interface PerformanceMetrics {
  url: string;
  method: string;
  status: number;
  duration: number;
  timestamp: Date;
  userAgent?: string;
  threshold: number;
  exceeded: boolean;
}

// Performance threshold (30 seconds in milliseconds)
const PERFORMANCE_THRESHOLD_MS = 30000;

// In-memory store for recent metrics (last 1000 requests)
const metricsStore: PerformanceMetrics[] = [];
const MAX_METRICS_STORE = 1000;

/**
 * Log performance metrics
 */
function logMetrics(metrics: PerformanceMetrics) {
  // Add to store
  metricsStore.push(metrics);
  
  // Keep only last MAX_METRICS_STORE entries
  if (metricsStore.length > MAX_METRICS_STORE) {
    metricsStore.shift();
  }

  // Log to console
  const emoji = metrics.exceeded ? '⚠️' : '✅';
  const durationSec = (metrics.duration / 1000).toFixed(2);
  
  logger.info(
    `${emoji} [Performance] ${metrics.method} ${metrics.url} - ` +
    `${durationSec}s (${metrics.status}) ${metrics.exceeded ? '⚠️ EXCEEDED THRESHOLD' : ''}`
  );

  // Alert if threshold exceeded
  if (metrics.exceeded) {
    logger.warn(
      `⚠️ PERFORMANCE WARNING: Request exceeded ${PERFORMANCE_THRESHOLD_MS / 1000}s threshold\n` +
      `   URL: ${metrics.url}\n` +
      `   Duration: ${durationSec}s\n` +
      `   Status: ${metrics.status}\n` +
      `   Timestamp: ${metrics.timestamp.toISOString()}`
    );
  }
}

/**
 * Performance monitoring middleware
 */
export function withPerformanceMonitoring(
  // eslint-disable-next-line no-unused-vars
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    
    try {
      // Execute the actual handler
      const response = await handler(req);
      
      const duration = Date.now() - startTime;
      const metrics: PerformanceMetrics = {
        url: req.url,
        method: req.method,
        status: response.status,
        duration,
        timestamp: new Date(),
        userAgent: req.headers.get('user-agent') || undefined,
        threshold: PERFORMANCE_THRESHOLD_MS,
        exceeded: duration > PERFORMANCE_THRESHOLD_MS
      };
      
      logMetrics(metrics);
      
      // Add performance headers to response
      response.headers.set('X-Response-Time', `${duration}ms`);
      response.headers.set('X-Performance-Threshold', `${PERFORMANCE_THRESHOLD_MS}ms`);
      
      if (metrics.exceeded) {
        response.headers.set('X-Performance-Warning', 'threshold-exceeded');
      }
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      const metrics: PerformanceMetrics = {
        url: req.url,
        method: req.method,
        status: 500,
        duration,
        timestamp: new Date(),
        userAgent: req.headers.get('user-agent') || undefined,
        threshold: PERFORMANCE_THRESHOLD_MS,
        exceeded: duration > PERFORMANCE_THRESHOLD_MS
      };
      
      logMetrics(metrics);
      throw error;
    }
  };
}

/**
 * Get performance statistics
 */
export function getPerformanceStats() {
  if (metricsStore.length === 0) {
    return {
      totalRequests: 0,
      avgDuration: 0,
      maxDuration: 0,
      minDuration: 0,
      exceededCount: 0,
      exceededPercentage: 0,
      p50: 0,
      p95: 0,
      p99: 0
    };
  }

  const durations = metricsStore.map(m => m.duration).sort((a, b) => a - b);
  const exceededCount = metricsStore.filter(m => m.exceeded).length;
  
  const p50Index = Math.floor(durations.length * 0.5);
  const p95Index = Math.floor(durations.length * 0.95);
  const p99Index = Math.floor(durations.length * 0.99);

  return {
    totalRequests: metricsStore.length,
    avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
    maxDuration: Math.max(...durations),
    minDuration: Math.min(...durations),
    exceededCount,
    exceededPercentage: (exceededCount / metricsStore.length) * 100,
    p50: durations[p50Index],
    p95: durations[p95Index],
    p99: durations[p99Index],
    threshold: PERFORMANCE_THRESHOLD_MS
  };
}

/**
 * Get recent performance metrics
 */
export function getRecentMetrics(limit: number = 100): PerformanceMetrics[] {
  return metricsStore.slice(-limit);
}

/**
 * Get metrics that exceeded threshold
 */
export function getExceededMetrics(): PerformanceMetrics[] {
  return metricsStore.filter(m => m.exceeded);
}

/**
 * Clear metrics store
 */
export function clearMetrics() {
  metricsStore.length = 0;
}

// Type for Web Vitals metric
interface WebVitalsMetric {
  name: string;
  value: number;
  id: string;
  delta?: number;
  rating?: 'good' | 'needs-improvement' | 'poor';
}

// Extend Window interface for gtag
/* eslint-disable no-unused-vars */
declare global {
  interface Window {
    gtag?: (
      command: string,
      name: string,
      params: Record<string, string | number | boolean>
    ) => void;
  }
}
/* eslint-enable no-unused-vars */

/**
 * Client-side performance monitoring
 * 
 * Usage in pages:
 * ```tsx
 * import { reportWebVitals } from '@/lib/performance'
 * 
 * export function reportWebVitals(metric: WebVitalsMetric) {
 *   reportWebVitals(metric)
 * }
 * ```
 */
export function reportWebVitals(metric: WebVitalsMetric) {
  const { name, value, id } = metric;
  
  // Log Web Vitals
  logger.info(`[Web Vitals] ${name}: ${value.toFixed(2)}ms (id: ${id})`);
  
  // Check against thresholds
  const thresholds: Record<string, number> = {
    FCP: 1800, // First Contentful Paint
    LCP: 2500, // Largest Contentful Paint
    FID: 100,  // First Input Delay
    CLS: 0.1,  // Cumulative Layout Shift
    TTFB: 800  // Time to First Byte
  };
  
  const threshold = thresholds[name];
  if (threshold && value > threshold) {
    logger.warn(
      `⚠️ [Web Vitals] ${name} exceeded threshold: ${value.toFixed(2)} > ${threshold}`
    );
  }
  
  // Send to analytics (optional)
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', name, {
      value: Math.round(name === 'CLS' ? value * 1000 : value),
      event_category: 'Web Vitals',
      event_label: id,
      non_interaction: true,
    });
  }
}

// Export types
export type { WebVitalsMetric };

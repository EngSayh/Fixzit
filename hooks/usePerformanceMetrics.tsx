/**
 * Real User Monitoring (RUM) - Lightweight Performance Tracking
 * 
 * Tracks Core Web Vitals and custom metrics:
 * - TTFB (Time to First Byte)
 * - FCP (First Contentful Paint)
 * - LCP (Largest Contentful Paint)
 * - FID (First Input Delay)
 * - CLS (Cumulative Layout Shift)
 * 
 * Sends data to Sentry Performance Monitoring
 * 
 * Usage:
 * ```tsx
 * // In app layout or _app
 * import { PerformanceMonitor } from "@/hooks/usePerformanceMetrics";
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <>
 *       <PerformanceMonitor />
 *       {children}
 *     </>
 *   );
 * }
 * ```
 */

"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { logger } from "@/lib/logger";

type SentryClient = {
  captureMessage: (
    message: string,
    context: { level: "warning" | "info"; extra: Record<string, unknown> }
  ) => void;
};

type SentryWindow = typeof window & { Sentry?: SentryClient };

interface PerformanceMetric {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  navigationType?: string;
  timestamp: number;
}

interface WebVitals {
  TTFB?: PerformanceMetric;
  FCP?: PerformanceMetric;
  LCP?: PerformanceMetric;
  FID?: PerformanceMetric;
  CLS?: PerformanceMetric;
}

/**
 * Get performance rating based on thresholds
 * https://web.dev/vitals/
 */
function getRating(name: string, value: number): "good" | "needs-improvement" | "poor" {
  const thresholds: Record<string, { good: number; poor: number }> = {
    TTFB: { good: 800, poor: 1800 },
    FCP: { good: 1800, poor: 3000 },
    LCP: { good: 2500, poor: 4000 },
    FID: { good: 100, poor: 300 },
    CLS: { good: 0.1, poor: 0.25 },
  };

  const threshold = thresholds[name];
  if (!threshold) return "good";

  if (value <= threshold.good) return "good";
  if (value <= threshold.poor) return "needs-improvement";
  return "poor";
}

/**
 * Send performance metric to Sentry
 */
function sendToSentry(metric: PerformanceMetric) {
  if (typeof window === "undefined") return;
  const sentry = (window as SentryWindow).Sentry;
  if (!sentry?.captureMessage) return;

  sentry.captureMessage(`Performance: ${metric.name}`, {
    level: metric.rating === "poor" ? "warning" : "info",
    extra: {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      navigationType: metric.navigationType,
      timestamp: metric.timestamp,
      url: window.location.href,
      userAgent: navigator.userAgent,
    },
  });
}

/**
 * usePerformanceMetrics Hook
 * 
 * Tracks Web Vitals for the current page
 */
export function usePerformanceMetrics() {
  const pathname = usePathname();
  const [metrics, setMetrics] = useState<WebVitals>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof PerformanceObserver === "undefined") return;

    const observers: PerformanceObserver[] = [];

    // TTFB (Time to First Byte)
    try {
      const navigationObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === "navigation") {
            const navEntry = entry as PerformanceNavigationTiming;
            const ttfb = navEntry.responseStart - navEntry.requestStart;

            const metric: PerformanceMetric = {
              name: "TTFB",
              value: ttfb,
              rating: getRating("TTFB", ttfb),
              navigationType: navEntry.type,
              timestamp: Date.now(),
            };

            setMetrics((prev) => ({ ...prev, TTFB: metric }));
            sendToSentry(metric);
          }
        });
      });

      navigationObserver.observe({ type: "navigation", buffered: true });
      observers.push(navigationObserver);
    } catch (error) {
      logger.warn("Navigation timing not supported", {
        component: "PerformanceMonitor",
        error,
      });
    }

    // FCP (First Contentful Paint)
    try {
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === "first-contentful-paint") {
            const metric: PerformanceMetric = {
              name: "FCP",
              value: entry.startTime,
              rating: getRating("FCP", entry.startTime),
              timestamp: Date.now(),
            };

            setMetrics((prev) => ({ ...prev, FCP: metric }));
            sendToSentry(metric);
          }
        });
      });

      fcpObserver.observe({ type: "paint", buffered: true });
      observers.push(fcpObserver);
    } catch (error) {
      logger.warn("FCP not supported", {
        component: "PerformanceMonitor",
        error,
      });
    }

    // LCP (Largest Contentful Paint)
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];

        if (lastEntry) {
          const metric: PerformanceMetric = {
            name: "LCP",
            value: lastEntry.startTime,
            rating: getRating("LCP", lastEntry.startTime),
            timestamp: Date.now(),
          };

          setMetrics((prev) => ({ ...prev, LCP: metric }));
          sendToSentry(metric);
        }
      });

      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
      observers.push(lcpObserver);
    } catch (error) {
      logger.warn("LCP not supported", {
        component: "PerformanceMonitor",
        error,
      });
    }

    // FID (First Input Delay) / INP (Interaction to Next Paint)
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const fidEntry = entry as PerformanceEventTiming;
          const fid = fidEntry.processingStart - fidEntry.startTime;

          const metric: PerformanceMetric = {
            name: "FID",
            value: fid,
            rating: getRating("FID", fid),
            timestamp: Date.now(),
          };

          setMetrics((prev) => ({ ...prev, FID: metric }));
          sendToSentry(metric);
        });
      });

      fidObserver.observe({ type: "first-input", buffered: true });
      observers.push(fidObserver);
    } catch (error) {
      logger.warn("FID not supported", {
        component: "PerformanceMonitor",
        error,
      });
    }

    // CLS (Cumulative Layout Shift)
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries() as PerformanceEntry[];
        entries.forEach((entry) => {
          // Type assertion for layout shift entries
          const layoutShift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
          if (!layoutShift.hadRecentInput && layoutShift.value) {
            clsValue += layoutShift.value;

            const metric: PerformanceMetric = {
              name: "CLS",
              value: clsValue,
              rating: getRating("CLS", clsValue),
              timestamp: Date.now(),
            };

            setMetrics((prev) => ({ ...prev, CLS: metric }));
            
            // Only send CLS on page unload (final value)
            // sendToSentry(metric); - uncomment if needed
          }
        });
      });

      clsObserver.observe({ type: "layout-shift", buffered: true });
      observers.push(clsObserver);
    } catch (error) {
      logger.warn("CLS not supported", {
        component: "PerformanceMonitor",
        error,
      });
    }

    // Cleanup
    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [pathname]);

  return metrics;
}

/**
 * PerformanceMonitor Component
 * 
 * Auto-tracks performance metrics and shows dev panel
 */
export function PerformanceMonitor() {
  const metrics = usePerformanceMetrics();

  // Dev panel (only in development)
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <div className="fixed top-4 end-4 z-[9999] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3 max-w-xs">
      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
        Web Vitals (Dev)
      </div>
      <div className="space-y-1 text-xs">
        {Object.entries(metrics).map(([key, metric]) => {
          if (!metric) return null;

          const colorClass =
            metric.rating === "good"
              ? "text-green-600 dark:text-green-400"
              : metric.rating === "needs-improvement"
              ? "text-yellow-600 dark:text-yellow-400"
              : "text-red-600 dark:text-red-400";

          return (
            <div key={key} className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">{key}:</span>
              <span className={`font-mono font-semibold ${colorClass}`}>
                {metric.value.toFixed(0)}
                {key === "CLS" ? "" : "ms"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Custom Performance Mark
 * 
 * Usage:
 * ```tsx
 * import { markPerformance, measurePerformance } from "@/hooks/usePerformanceMetrics";
 * 
 * markPerformance("data-fetch-start");
 * await fetchData();
 * const duration = measurePerformance("data-fetch-start", "data-fetch-end");
 * ```
 */
export function markPerformance(name: string) {
  if (typeof window === "undefined") return;
  if (!window.performance?.mark) return;
  
  try {
    performance.mark(name);
  } catch (error) {
    logger.warn("Performance mark failed", {
      component: "PerformanceMonitor",
      error,
    });
  }
}

export function measurePerformance(startMark: string, endMark: string): number | null {
  if (typeof window === "undefined") return null;
  if (!window.performance?.measure) return null;

  try {
    performance.mark(endMark);
    const measure = performance.measure(`${startMark}-to-${endMark}`, startMark, endMark);
    return measure.duration;
  } catch (error) {
    logger.warn("Performance measure failed", {
      component: "PerformanceMonitor",
      error,
    });
    return null;
  }
}

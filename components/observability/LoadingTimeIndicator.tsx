"use client";

/**
 * LoadingTimeIndicator Component
 * 
 * Shows loading duration for API calls and warns about slow queries.
 * 
 * - Tracks request start/end times
 * - Shows spinner with elapsed time
 * - Warns when query exceeds threshold (default: 3s)
 * - Logs slow queries to Sentry
 * 
 * Usage:
 * <LoadingTimeIndicator isLoading={isLoading} threshold={3000} />
 */

import React, { useEffect, useState, useRef } from "react";
import { Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LoadingTimeIndicatorProps {
  isLoading: boolean;
  threshold?: number; // milliseconds (default: 3000)
  label?: string;
  className?: string;
  onSlowQuery?: (duration: number) => void;
}

export function LoadingTimeIndicator({
  isLoading,
  threshold = 3000,
  label = "Loading",
  className,
  onSlowQuery,
}: LoadingTimeIndicatorProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [warnedSlow, setWarnedSlow] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading) {
      // Start timer
      startTimeRef.current = Date.now();
      setElapsedTime(0);
      setWarnedSlow(false);

      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Date.now() - startTimeRef.current;
          setElapsedTime(elapsed);

          // Warn if slow
          if (elapsed >= threshold && !warnedSlow) {
            setWarnedSlow(true);

            toast.warning(
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>
                  Slow query detected: {(elapsed / 1000).toFixed(1)}s
                </span>
              </div>,
              {
                id: `slow-query-${startTimeRef.current}`,
                duration: 5000,
              }
            );

            // Log to Sentry
            if (typeof window !== "undefined" && (window as any).Sentry) {
              (window as any).Sentry.captureMessage("Slow query detected", {
                level: "warning",
                extra: {
                  duration: elapsed,
                  threshold,
                  label,
                },
              });
            }

            onSlowQuery?.(elapsed);
          }
        }
      }, 100); // Update every 100ms
    } else {
      // Stop timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (startTimeRef.current) {
        const finalDuration = Date.now() - startTimeRef.current;

        // Log to console in development
        if (process.env.NODE_ENV === "development") {
          console.log(`[LoadingTime] ${label}: ${finalDuration}ms`);
        }

        startTimeRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isLoading, threshold, label, warnedSlow, onSlowQuery]);

  if (!isLoading && elapsedTime === 0) return null;

  const isSlow = elapsedTime >= threshold;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 text-sm",
        isSlow ? "text-yellow-600 dark:text-yellow-400" : "text-slate-600 dark:text-slate-400",
        className
      )}
    >
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>{label}...</span>
      {elapsedTime > 0 && (
        <span className="font-mono text-xs">
          {(elapsedTime / 1000).toFixed(1)}s
        </span>
      )}
      {isSlow && <Clock className="w-4 h-4" />}
    </div>
  );
}

/**
 * useLoadingTime Hook
 * 
 * Track loading time for custom logic
 * 
 * Usage:
 * const { elapsedTime, isSlow } = useLoadingTime(isLoading, 3000);
 */
export function useLoadingTime(isLoading: boolean, threshold = 3000) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isSlow, setIsSlow] = useState(false);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      startTimeRef.current = Date.now();
      setElapsedTime(0);
      setIsSlow(false);

      const interval = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Date.now() - startTimeRef.current;
          setElapsedTime(elapsed);
          setIsSlow(elapsed >= threshold);
        }
      }, 100);

      return () => clearInterval(interval);
    } else {
      startTimeRef.current = null;
      setElapsedTime(0);
      setIsSlow(false);
    }
  }, [isLoading, threshold]);

  return { elapsedTime, isSlow };
}

/**
 * QueryPerformanceTable Component
 * 
 * Shows a table of recent API calls with their durations
 * Useful for debugging performance issues
 */
interface QueryPerformance {
  id: string;
  endpoint: string;
  duration: number;
  timestamp: number;
  status: number;
}

export function QueryPerformanceTable() {
  const [queries, setQueries] = useState<QueryPerformance[]>([]);

  useEffect(() => {
    // Intercept fetch to track performance
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const startTime = Date.now();
      let endpoint = "unknown";
      
      if (typeof args[0] === "string") {
        endpoint = args[0];
      } else if (args[0] instanceof URL) {
        endpoint = args[0].href;
      } else if (args[0] instanceof Request) {
        endpoint = args[0].url;
      }

      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;

        // Add to queries list
        setQueries((prev) => [
          {
            id: `${Date.now()}-${Math.random()}`,
            endpoint,
            duration,
            timestamp: Date.now(),
            status: response.status,
          },
          ...prev.slice(0, 49), // Keep last 50
        ]);

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;

        setQueries((prev) => [
          {
            id: `${Date.now()}-${Math.random()}`,
            endpoint,
            duration,
            timestamp: Date.now(),
            status: 0, // Failed
          },
          ...prev.slice(0, 49),
        ]);

        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  if (process.env.NODE_ENV !== "development") return null;

  return (
    <div className="fixed bottom-4 start-4 z-[9999] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3 max-w-2xl max-h-96 overflow-auto">
      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
        Query Performance (Dev)
      </div>
      <table className="text-xs w-full">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th className="text-start py-1 px-2">Endpoint</th>
            <th className="text-end py-1 px-2">Duration</th>
            <th className="text-end py-1 px-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {queries.map((query) => (
            <tr
              key={query.id}
              className={cn(
                "border-b border-slate-100 dark:border-slate-800",
                query.duration >= 3000 && "bg-yellow-50 dark:bg-yellow-900/20"
              )}
            >
              <td className="py-1 px-2 truncate max-w-xs">{query.endpoint}</td>
              <td
                className={cn(
                  "text-end py-1 px-2 font-mono",
                  query.duration >= 3000
                    ? "text-yellow-600 dark:text-yellow-400 font-semibold"
                    : "text-slate-600 dark:text-slate-400"
                )}
              >
                {query.duration}ms
              </td>
              <td
                className={cn(
                  "text-end py-1 px-2 font-mono",
                  query.status >= 200 && query.status < 300
                    ? "text-green-600 dark:text-green-400"
                    : query.status >= 400
                    ? "text-red-600 dark:text-red-400"
                    : "text-slate-600 dark:text-slate-400"
                )}
              >
                {query.status || "ERR"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

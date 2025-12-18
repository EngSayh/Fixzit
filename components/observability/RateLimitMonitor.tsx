"use client";

/**
 * Rate Limit Monitor Component
 * 
 * Extracts rate-limit headers from API responses and shows warnings
 * when consumption reaches 80% threshold.
 * 
 * - Tracks rate limit remaining from headers
 * - Shows toast warnings at 80% consumption
 * - Logs rate limit hits to Sentry
 * - Dev tools panel for debugging
 */

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  percentage: number;
  retryAfter?: number; // Seconds until retry is safe (from Retry-After header)
}

export function useRateLimitMonitor() {
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);

  const checkRateLimit = (headers: Headers): RateLimitInfo | null => {
    const limit = parseInt(headers.get("X-RateLimit-Limit") || "0", 10);
    const remaining = parseInt(headers.get("X-RateLimit-Remaining") || "0", 10);
    const reset = parseInt(headers.get("X-RateLimit-Reset") || "0", 10);

    // Parse Retry-After header (RFC 7231 - can be seconds or HTTP-date)
    const retryAfterRaw = headers.get("Retry-After");
    let retryAfter: number | undefined;
    if (retryAfterRaw) {
      const parsed = parseInt(retryAfterRaw, 10);
      if (!isNaN(parsed)) {
        retryAfter = parsed;
      } else {
        // Try parsing as HTTP-date
        const date = Date.parse(retryAfterRaw);
        if (!isNaN(date)) {
          retryAfter = Math.max(0, Math.floor((date - Date.now()) / 1000));
        }
      }
    }

    if (!limit) return null;

    const percentage = ((limit - remaining) / limit) * 100;

    const info: RateLimitInfo = {
      limit,
      remaining,
      reset,
      percentage,
      retryAfter,
    };

    setRateLimitInfo(info);

    // Warn at 80% consumption
    if (percentage >= 80 && remaining > 0) {
      toast.warning(
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>
            Rate limit warning: {remaining}/{limit} requests remaining
          </span>
        </div>,
        {
          id: "rate-limit-warning", // Dedupe
          duration: 5000,
        }
      );

      if (typeof window !== "undefined") {
        const sentry = (window as typeof window & {
          Sentry?: { captureMessage: (msg: string, opts: { level: string; extra: Record<string, unknown> }) => void };
        }).Sentry;

        sentry?.captureMessage("Rate limit warning", {
          level: "warning",
          extra: {
            limit,
            remaining,
            percentage: percentage.toFixed(2),
            resetTime: new Date(reset * 1000).toISOString(),
          },
        });
      }
    }

    // Critical warning at 95%
    if (percentage >= 95 && remaining > 0) {
      toast.error(
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>
            Rate limit critical: {remaining}/{limit} requests remaining
          </span>
        </div>,
        {
          id: "rate-limit-critical",
          duration: 10000,
        }
      );

      if (typeof window !== "undefined") {
        const sentry = (window as typeof window & {
          Sentry?: { captureMessage: (msg: string, opts: { level: string; extra: Record<string, unknown> }) => void };
        }).Sentry;

        sentry?.captureMessage("Rate limit critical", {
          level: "error",
          extra: {
            limit,
            remaining,
            percentage: percentage.toFixed(2),
            resetTime: new Date(reset * 1000).toISOString(),
          },
        });
      }
    }

    return info;
  };

  return { rateLimitInfo, checkRateLimit };
}

/**
 * Rate Limit DevTools Panel
 * 
 * Shows in development mode for debugging rate limits
 */
export function RateLimitDevPanel({ info }: { info: RateLimitInfo | null }) {
  if (!info || process.env.NODE_ENV !== "development") return null;

  const resetTime = new Date(info.reset * 1000);
  const now = new Date();
  const secondsUntilReset = Math.max(0, Math.floor((resetTime.getTime() - now.getTime()) / 1000));

  const getColorClass = (percentage: number) => {
    if (percentage >= 95) return "text-red-600 dark:text-red-400";
    if (percentage >= 80) return "text-yellow-600 dark:text-yellow-400";
    return "text-green-600 dark:text-green-400";
  };

  return (
    <div className="fixed bottom-4 end-4 z-[9999] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3 max-w-xs">
      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
        Rate Limit (Dev)
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-600 dark:text-slate-400">Remaining:</span>
          <span className={`font-mono font-semibold ${getColorClass(info.percentage)}`}>
            {info.remaining}/{info.limit}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600 dark:text-slate-400">Used:</span>
          <span className={`font-mono font-semibold ${getColorClass(info.percentage)}`}>
            {info.percentage.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600 dark:text-slate-400">Reset in:</span>
          <span className="font-mono text-slate-700 dark:text-slate-300">
            {Math.floor(secondsUntilReset / 60)}m {secondsUntilReset % 60}s
          </span>
        </div>
        {info.retryAfter !== undefined && (
          <div className="flex justify-between mt-1 pt-1 border-t border-slate-200 dark:border-slate-700">
            <span className="text-slate-600 dark:text-slate-400">Retry-After:</span>
            <span className="font-mono text-orange-600 dark:text-orange-400">
              {info.retryAfter}s
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Intercept fetch to extract rate limit headers
 * 
 * Usage in _app or root layout:
 * useRateLimitInterceptor()
 */
export function useRateLimitInterceptor() {
  const { rateLimitInfo, checkRateLimit } = useRateLimitMonitor();
  const [devPanelVisible, setDevPanelVisible] = useState(false);

  useEffect(() => {
    const originalFetch: typeof fetch = window.fetch;

    window.fetch = async (
      ...args: Parameters<typeof fetch>
    ): Promise<Response> => {
      const response = await originalFetch(...args);

      // Clone response to read headers without consuming body
      const clonedResponse = response.clone();

      // Check rate limit headers
      const info = checkRateLimit(clonedResponse.headers);

      if (info && process.env.NODE_ENV === "development") {
        setDevPanelVisible(true);
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [checkRateLimit]);

  return { rateLimitInfo, devPanelVisible };
}

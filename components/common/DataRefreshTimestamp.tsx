"use client";

import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Clock } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/TranslationContext";

interface DataRefreshTimestampProps {
  /** Last refresh timestamp (ISO string or Date) */
  lastRefresh?: string | Date | null;
  /** Callback to trigger a refresh */
  onRefresh?: () => void | Promise<void>;
  /** Whether a refresh is currently in progress */
  isRefreshing?: boolean;
  /** Auto-refresh interval in seconds (0 to disable) */
  autoRefreshSeconds?: number;
  /** Show relative time (e.g., "2 minutes ago") */
  showRelativeTime?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays the last data refresh timestamp with optional refresh button.
 * P123: Optional Enhancement - Data refresh timestamps for dashboards.
 *
 * @example
 * ```tsx
 * <DataRefreshTimestamp
 *   lastRefresh={data?.updatedAt}
 *   onRefresh={() => mutate()}
 *   isRefreshing={isValidating}
 *   autoRefreshSeconds={60}
 * />
 * ```
 */
export function DataRefreshTimestamp({
  lastRefresh,
  onRefresh,
  isRefreshing = false,
  autoRefreshSeconds = 0,
  showRelativeTime = true,
  className,
}: DataRefreshTimestampProps) {
  const { t, isRTL } = useTranslation();
  const [relativeTime, setRelativeTime] = useState<string>("");
  const [nextRefresh, setNextRefresh] = useState<number>(autoRefreshSeconds);

  const formatRelativeTime = useCallback((date: Date): string => {
    const now = Date.now();
    const diff = now - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 10) {
      return t("common.time.justNow", "Just now");
    } else if (seconds < 60) {
      return t("common.time.secondsAgo", "{{count}} seconds ago", { count: seconds });
    } else if (minutes < 60) {
      return t("common.time.minutesAgo", "{{count}} minutes ago", { count: minutes });
    } else if (hours < 24) {
      return t("common.time.hoursAgo", "{{count}} hours ago", { count: hours });
    } else {
      return date.toLocaleString();
    }
  }, [t]);

  // Update relative time every 10 seconds
  useEffect(() => {
    if (!lastRefresh || !showRelativeTime) return;

    const date = typeof lastRefresh === "string" ? new Date(lastRefresh) : lastRefresh;
    setRelativeTime(formatRelativeTime(date));

    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime(date));
    }, 10_000);

    return () => clearInterval(interval);
  }, [lastRefresh, showRelativeTime, formatRelativeTime]);

  // Auto-refresh countdown
  useEffect(() => {
    if (autoRefreshSeconds <= 0 || !onRefresh) return;

    setNextRefresh(autoRefreshSeconds);

    const interval = setInterval(() => {
      setNextRefresh((prev) => {
        if (prev <= 1) {
          onRefresh();
          return autoRefreshSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefreshSeconds, onRefresh]);

  const handleRefreshClick = async () => {
    if (isRefreshing || !onRefresh) return;
    await onRefresh();
    setNextRefresh(autoRefreshSeconds);
  };

  const timestamp = lastRefresh
    ? typeof lastRefresh === "string"
      ? new Date(lastRefresh)
      : lastRefresh
    : null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs text-muted-foreground",
        isRTL && "flex-row-reverse",
        className
      )}
    >
      <Clock className="h-3 w-3" aria-hidden />

      {timestamp ? (
        <span
          title={timestamp.toLocaleString()}
          className="tabular-nums"
        >
          {showRelativeTime
            ? relativeTime
            : timestamp.toLocaleTimeString()}
        </span>
      ) : (
        <span>{t("common.time.never", "Never refreshed")}</span>
      )}

      {onRefresh && (
        <button
          type="button"
          onClick={handleRefreshClick}
          disabled={isRefreshing}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
            "bg-muted/50 hover:bg-muted transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          aria-label={t("common.actions.refresh", "Refresh data")}
          title={
            autoRefreshSeconds > 0
              ? t("common.time.nextRefresh", "Next refresh in {{seconds}}s", {
                  seconds: nextRefresh,
                })
              : t("common.actions.refresh", "Refresh")
          }
        >
          <RefreshCw
            className={cn(
              "h-3 w-3",
              isRefreshing && "animate-spin"
            )}
            aria-hidden
          />
          {autoRefreshSeconds > 0 && (
            <span className="tabular-nums">{nextRefresh}s</span>
          )}
        </button>
      )}
    </div>
  );
}

export default DataRefreshTimestamp;

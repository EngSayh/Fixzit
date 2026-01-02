/**
 * useSuperadminNotificationCount Hook
 * 
 * @description Fetches notification count for superadmin badge display.
 * Polls every 30 seconds to keep badge updated.
 * 
 * @feature Superadmin Notification Badge
 * @module hooks/superadmin/useSuperadminNotificationCount
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/logger";

interface NotificationCountResponse {
  success: boolean;
  count: number;
  breakdown?: {
    pending: number;
    failed: number;
    mfaApprovals: number;
  };
}

// Poll interval: 30 seconds (matches server cache)
const POLL_INTERVAL = 30_000;

export function useSuperadminNotificationCount() {
  const [count, setCount] = useState(0);
  const [breakdown, setBreakdown] = useState<NotificationCountResponse["breakdown"]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      const response = await fetch("/api/superadmin/notifications/count", {
        credentials: "include",
      });
      
      if (!response.ok) {
        // Silently fail for 401 (logged out) - don't spam logs
        if (response.status === 401) {
          setCount(0);
          return;
        }
        throw new Error(`Failed to fetch count: ${response.status}`);
      }

      const data: NotificationCountResponse = await response.json();
      
      if (data.success) {
        setCount(data.count);
        setBreakdown(data.breakdown);
        setError(null);
      }
    } catch (err) {
      logger.warn("[useSuperadminNotificationCount] Fetch error", { error: err });
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchCount();

    // Set up polling
    const intervalId = setInterval(fetchCount, POLL_INTERVAL);

    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, [fetchCount]);

  // Manual refresh function
  const refresh = useCallback(() => {
    setLoading(true);
    fetchCount();
  }, [fetchCount]);

  return {
    count,
    breakdown,
    loading,
    error,
    refresh,
  };
}

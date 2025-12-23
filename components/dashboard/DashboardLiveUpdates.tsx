"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Config } from "@/lib/config/constants";
import { logger } from "@/lib/logger";

type LivePayload = {
  orgId?: string;
  data?: Record<string, unknown>;
};

const DEFAULT_MIN_INTERVAL_MS = 30_000;

export default function DashboardLiveUpdates({
  minIntervalMs = DEFAULT_MIN_INTERVAL_MS,
}: {
  minIntervalMs?: number;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const sessionUser = session?.user as { orgId?: string } | undefined;
  const orgId = sessionUser?.orgId;
  const isAuthenticated = status === "authenticated" && Boolean(orgId);
  const lastRefreshRef = useRef(0);
  const pendingRefreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const wsUrl = Config.client.wsUrl;
    if (!isAuthenticated || !orgId || !wsUrl) return undefined;

    const url = new URL(wsUrl);
    url.searchParams.set("orgId", orgId);
    const ws = new WebSocket(url.toString());

    const scheduleRefresh = () => {
      const now = Date.now();
      const elapsed = now - lastRefreshRef.current;
      if (elapsed >= minIntervalMs) {
        lastRefreshRef.current = now;
        router.refresh();
        return;
      }

      if (!pendingRefreshRef.current) {
        const delay = Math.max(250, minIntervalMs - elapsed);
        pendingRefreshRef.current = setTimeout(() => {
          lastRefreshRef.current = Date.now();
          pendingRefreshRef.current = null;
          router.refresh();
        }, delay);
      }
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as LivePayload;
        if (!payload || payload.orgId !== orgId || typeof payload.data !== "object") {
          return;
        }
        scheduleRefresh();
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onerror = (error) => {
      logger.warn("[Dashboard] Live update WebSocket error", {
        error,
        orgId,
        component: "DashboardLiveUpdates",
      });
    };

    return () => {
      if (pendingRefreshRef.current) {
        clearTimeout(pendingRefreshRef.current);
        pendingRefreshRef.current = null;
      }
      ws.close();
    };
  }, [isAuthenticated, minIntervalMs, orgId, router]);

  return null;
}

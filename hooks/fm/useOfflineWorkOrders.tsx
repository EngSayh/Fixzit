"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useOnlineStatus } from "@/components/common/OfflineIndicator";
import { logger } from "@/lib/logger";
import {
  OFFLINE_WORK_ORDER_EVENT,
  getOfflineWorkOrderQueue,
  syncOfflineWorkOrders,
  type OfflineWorkOrderQueueItem,
} from "@/lib/offline/work-orders";

export function useOfflineWorkOrderQueue(orgId?: string | null) {
  const [items, setItems] = useState<OfflineWorkOrderQueueItem[]>([]);

  const refresh = useCallback(() => {
    if (!orgId) {
      setItems([]);
      return;
    }
    setItems(getOfflineWorkOrderQueue(orgId));
  }, [orgId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    refresh();
    const handle = () => refresh();
    window.addEventListener("storage", handle);
    window.addEventListener(OFFLINE_WORK_ORDER_EVENT, handle as EventListener);
    return () => {
      window.removeEventListener("storage", handle);
      window.removeEventListener(
        OFFLINE_WORK_ORDER_EVENT,
        handle as EventListener,
      );
    };
  }, [refresh]);

  return { items, refresh };
}

export function useOfflineWorkOrderSync(
  orgId?: string | null,
  onSynced?: (result: { synced: number; failed: number; remaining: number }) => void,
) {
  const { isOnline } = useOnlineStatus();
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!orgId || !isOnline || syncingRef.current) return;
    let cancelled = false;
    syncingRef.current = true;
    syncOfflineWorkOrders({ orgId })
      .then((result) => {
        if (!cancelled) {
          onSynced?.(result);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          logger.error("[offline-work-orders] Sync failed", { error, orgId });
        }
      })
      .finally(() => {
        if (!cancelled) {
          syncingRef.current = false;
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOnline, onSynced, orgId]);
}

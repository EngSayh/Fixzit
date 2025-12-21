import { logger } from "@/lib/logger";
import type { WorkOrderPriority } from "@/lib/sla";

const OFFLINE_QUEUE_KEY = "fxz.offline.work-orders.queue";
const OFFLINE_CACHE_PREFIX = "fxz.offline.work-orders.cache";
const OFFLINE_CACHE_INDEX_KEY = "fxz.offline.work-orders.cache.index";
const OFFLINE_DRAFT_PREFIX = "fxz.offline.work-orders.draft";
const OFFLINE_EVENT_NAME = "fxz:offline-work-orders:updated";
const MAX_QUEUE_ITEMS = 40;
const MAX_CACHE_ENTRIES = 12;
let syncInFlight = false;

export type OfflineWorkOrderPayload = {
  title: string;
  description?: string;
  priority?: WorkOrderPriority;
  category?: string;
  propertyId?: string;
  unitNumber?: string;
  status?: string;
};

export type OfflineWorkOrderQueueItem = {
  id: string;
  orgId: string;
  payload: OfflineWorkOrderPayload;
  createdAt: string;
  status: "queued" | "syncing" | "failed";
  lastError?: string;
};

export type WorkOrdersCacheEntry<T> = {
  orgId: string;
  query: string;
  savedAt: string;
  data: T;
};

export type WorkOrderDraft = {
  title: string;
  description: string;
  priority: WorkOrderPriority;
  category: string;
  propertyId: string;
  unitNumber: string;
  updatedAt: string;
};

const canUseStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const emitUpdate = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OFFLINE_EVENT_NAME));
};

const safeReadJson = <T>(key: string): T | null => {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    logger.warn("[offline-work-orders] Failed to read storage", {
      key,
      error,
    });
    return null;
  }
};

const safeWriteJson = (key: string, value: unknown) => {
  if (!canUseStorage()) {
    const error = new Error("Offline storage unavailable");
    logger.error("[offline-work-orders] Storage unavailable", { key, error });
    throw error;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    logger.error("[offline-work-orders] Failed to write storage", {
      key,
      error,
    });
    throw error instanceof Error ? error : new Error("Storage write failed");
  }
};

const safeRemove = (key: string) => {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    logger.warn("[offline-work-orders] Failed to remove storage", {
      key,
      error,
    });
  }
};

const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const readQueue = (): OfflineWorkOrderQueueItem[] => {
  const data = safeReadJson<OfflineWorkOrderQueueItem[]>(OFFLINE_QUEUE_KEY);
  if (!Array.isArray(data)) return [];
  return data.filter(
    (item) =>
      item &&
      typeof item.id === "string" &&
      typeof item.orgId === "string" &&
      typeof item.createdAt === "string" &&
      typeof item.payload === "object",
  );
};

const writeQueue = (queue: OfflineWorkOrderQueueItem[]) => {
  safeWriteJson(OFFLINE_QUEUE_KEY, queue.slice(-MAX_QUEUE_ITEMS));
  emitUpdate();
};

const updateQueueItem = (
  queue: OfflineWorkOrderQueueItem[],
  id: string,
  update: Partial<OfflineWorkOrderQueueItem>,
) =>
  queue.map((item) => (item.id === id ? { ...item, ...update } : item));

export const OFFLINE_WORK_ORDER_EVENT = OFFLINE_EVENT_NAME;

export function getOfflineWorkOrderQueue(orgId?: string): OfflineWorkOrderQueueItem[] {
  const queue = readQueue();
  if (!orgId) return queue;
  return queue.filter((item) => item.orgId === orgId);
}

export function queueOfflineWorkOrder(
  payload: OfflineWorkOrderPayload,
  orgId: string,
): OfflineWorkOrderQueueItem {
  if (!orgId) {
    throw new Error("orgId is required to queue offline work orders");
  }
  const queue = readQueue();
  const item: OfflineWorkOrderQueueItem = {
    id: generateId(),
    orgId,
    payload,
    createdAt: new Date().toISOString(),
    status: "queued",
  };
  writeQueue([...queue, item]);
  return item;
}

export function readWorkOrdersCache<T>(
  orgId: string,
  query: string,
): WorkOrdersCacheEntry<T> | null {
  if (!orgId) return null;
  const key = getWorkOrdersCacheKey(orgId, query);
  const entry = safeReadJson<WorkOrdersCacheEntry<T>>(key);
  if (!entry || entry.orgId !== orgId) return null;
  return entry;
}

export function writeWorkOrdersCache<T>(
  orgId: string,
  query: string,
  data: T,
): WorkOrdersCacheEntry<T> {
  if (!orgId) {
    throw new Error("orgId is required to cache work orders");
  }
  const key = getWorkOrdersCacheKey(orgId, query);
  const entry: WorkOrdersCacheEntry<T> = {
    orgId,
    query,
    savedAt: new Date().toISOString(),
    data,
  };
  safeWriteJson(key, entry);

  const existingIndex = safeReadJson<string[]>(OFFLINE_CACHE_INDEX_KEY) || [];
  const nextIndex = [key, ...existingIndex.filter((value) => value !== key)];
  const trimmedIndex = nextIndex.slice(0, MAX_CACHE_ENTRIES);
  const removedKeys = nextIndex.slice(MAX_CACHE_ENTRIES);
  safeWriteJson(OFFLINE_CACHE_INDEX_KEY, trimmedIndex);
  removedKeys.forEach((oldKey) => safeRemove(oldKey));
  return entry;
}

export function readWorkOrderDraft(orgId: string): WorkOrderDraft | null {
  if (!orgId) return null;
  const key = getWorkOrderDraftKey(orgId);
  const draft = safeReadJson<WorkOrderDraft>(key);
  return draft && draft.updatedAt ? draft : null;
}

export function writeWorkOrderDraft(orgId: string, draft: WorkOrderDraft): WorkOrderDraft {
  if (!orgId) {
    throw new Error("orgId is required to store work order drafts");
  }
  const entry: WorkOrderDraft = {
    ...draft,
    updatedAt: new Date().toISOString(),
  };
  safeWriteJson(getWorkOrderDraftKey(orgId), entry);
  return entry;
}

export function clearWorkOrderDraft(orgId: string) {
  if (!orgId) return;
  safeRemove(getWorkOrderDraftKey(orgId));
}

export async function syncOfflineWorkOrders({
  orgId,
}: {
  orgId: string;
}): Promise<{ synced: number; failed: number; remaining: number }> {
  if (!orgId) {
    return { synced: 0, failed: 0, remaining: 0 };
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, failed: 0, remaining: 0 };
  }

  if (syncInFlight) {
    return {
      synced: 0,
      failed: 0,
      remaining: getOfflineWorkOrderQueue(orgId).length,
    };
  }

  const queue = readQueue();
  const targets = queue.filter((item) => item.orgId === orgId);
  if (!targets.length) {
    return { synced: 0, failed: 0, remaining: 0 };
  }

  syncInFlight = true;
  let updatedQueue = queue;
  let synced = 0;
  let failed = 0;
  try {
    for (const item of targets) {
      updatedQueue = updateQueueItem(updatedQueue, item.id, {
        status: "syncing",
        lastError: undefined,
      });
      writeQueue(updatedQueue);

      try {
        const response = await fetch("/api/work-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(item.payload),
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || `Sync failed (${response.status})`);
        }

        synced += 1;
        updatedQueue = updatedQueue.filter((queued) => queued.id !== item.id);
        writeQueue(updatedQueue);
      } catch (error) {
        failed += 1;
        const message =
          error instanceof Error ? error.message : "Offline sync failed";
        updatedQueue = updateQueueItem(updatedQueue, item.id, {
          status: "failed",
          lastError: message.slice(0, 200),
        });
        writeQueue(updatedQueue);
        logger.error("[offline-work-orders] Sync failed", {
          id: item.id,
          orgId: item.orgId,
          error,
        });
      }
    }

    return {
      synced,
      failed,
      remaining: updatedQueue.filter((item) => item.orgId === orgId).length,
    };
  } finally {
    syncInFlight = false;
  }
}

export function getWorkOrdersCacheKey(orgId: string, query: string) {
  const normalizedQuery = encodeURIComponent(query || "default");
  return `${OFFLINE_CACHE_PREFIX}:${orgId}:${normalizedQuery}`;
}

function getWorkOrderDraftKey(orgId: string) {
  return `${OFFLINE_DRAFT_PREFIX}:${orgId}`;
}

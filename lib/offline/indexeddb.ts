/**
 * @fileoverview IndexedDB Storage for Offline Technician Mode
 * @module lib/offline/indexeddb
 *
 * Provides IndexedDB-based storage for larger offline data that exceeds
 * localStorage limits. Used for:
 * - Work order details with full metadata
 * - Inspection templates and in-progress inspections
 * - Photo blobs for offline capture
 * - Technician schedules and assignments
 *
 * @implements IMP-UX-004 - Offline Technician Mode
 * @created 2025-01-09
 * @status IMPLEMENTED [AGENT-0031]
 */

import { logger } from "@/lib/logger";
import { WORK_ORDERS_ENTITY_LEGACY } from "@/config/topbar-modules";

// ============================================================================
// Constants
// ============================================================================

const DB_NAME = "fixzit-offline";
const DB_VERSION = 1;

/** Object store names */
export const STORES = {
  WORK_ORDERS: WORK_ORDERS_ENTITY_LEGACY,
  INSPECTIONS: "inspections",
  INSPECTION_TEMPLATES: "inspection_templates",
  PHOTO_QUEUE: "photo_queue",
  TECHNICIAN_SCHEDULE: "technician_schedule",
  SYNC_QUEUE: "sync_queue",
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

// ============================================================================
// Types
// ============================================================================

export interface OfflineWorkOrder {
  id: string;
  orgId: string;
  workOrderNumber: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  category?: string;
  propertyId?: string;
  unitNumber?: string;
  assignedTo?: string;
  scheduledAt?: string;
  dueAt?: string;
  checklists?: Array<{
    title: string;
    items: Array<{ label: string; done: boolean }>;
  }>;
  photos?: Array<{ id: string; url: string; type: string }>;
  metadata?: Record<string, unknown>;
  cachedAt: string;
  lastModified: string;
}

export interface OfflineInspection {
  id: string;
  offlineId: string;
  orgId: string;
  templateId: string;
  propertyId: string;
  unitId?: string;
  type: string;
  status: "scheduled" | "in_progress" | "pending_sync" | "synced";
  scheduledDate: string;
  inspectorId: string;
  findings: Array<{
    id: string;
    itemId: string;
    severity: string;
    title: string;
    description: string;
    photoIds: string[];
    resolved: boolean;
  }>;
  completedItems: string[];
  startedAt?: string;
  completedAt?: string;
  cachedAt: string;
  lastModified: string;
}

export interface OfflineInspectionTemplate {
  id: string;
  orgId: string;
  name: string;
  type: string;
  categories: Array<{
    id: string;
    name: string;
    items: Array<{
      id: string;
      label: string;
      required: boolean;
      requiresPhoto: boolean;
    }>;
  }>;
  cachedAt: string;
}

export interface OfflinePhoto {
  id: string;
  orgId: string;
  entityType: "work_order" | "inspection";
  entityId: string;
  fileName: string;
  mimeType: string;
  blob: Blob;
  caption?: string;
  photoType?: "before" | "after" | "finding" | "attachment";
  geoLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  capturedAt: string;
  syncStatus: "pending" | "syncing" | "synced" | "failed";
  syncError?: string;
  retryCount: number;
}

export interface SyncQueueItem {
  id: string;
  orgId: string;
  entityType: "work_order" | "inspection" | "photo";
  entityId: string;
  action: "create" | "update" | "delete";
  payload: unknown;
  createdAt: string;
  syncStatus: "pending" | "syncing" | "synced" | "failed";
  syncError?: string;
  retryCount: number;
  lastAttempt?: string;
}

export interface TechnicianScheduleItem {
  id: string;
  orgId: string;
  technicianId: string;
  workOrderId: string;
  propertyAddress: string;
  unitNumber?: string;
  scheduledAt: string;
  priority: string;
  status: string;
  cachedAt: string;
}

// ============================================================================
// Database Connection
// ============================================================================

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Open or get the IndexedDB database connection
 */
export function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      logger.error("[indexeddb] Failed to open database", {
        error: request.error,
      });
      reject(request.error);
    };

    request.onsuccess = () => {
      logger.info("[indexeddb] Database opened successfully", {
        version: DB_VERSION,
      });
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Work Orders store
      if (!db.objectStoreNames.contains(STORES.WORK_ORDERS)) {
        const woStore = db.createObjectStore(STORES.WORK_ORDERS, {
          keyPath: "id",
        });
        woStore.createIndex("orgId", "orgId", { unique: false });
        woStore.createIndex("status", "status", { unique: false });
        woStore.createIndex("assignedTo", "assignedTo", { unique: false });
        woStore.createIndex("cachedAt", "cachedAt", { unique: false });
      }

      // Inspections store
      if (!db.objectStoreNames.contains(STORES.INSPECTIONS)) {
        const inspStore = db.createObjectStore(STORES.INSPECTIONS, {
          keyPath: "id",
        });
        inspStore.createIndex("orgId", "orgId", { unique: false });
        inspStore.createIndex("offlineId", "offlineId", { unique: true });
        inspStore.createIndex("status", "status", { unique: false });
        inspStore.createIndex("inspectorId", "inspectorId", { unique: false });
      }

      // Inspection Templates store
      if (!db.objectStoreNames.contains(STORES.INSPECTION_TEMPLATES)) {
        const templateStore = db.createObjectStore(STORES.INSPECTION_TEMPLATES, {
          keyPath: "id",
        });
        templateStore.createIndex("orgId", "orgId", { unique: false });
        templateStore.createIndex("type", "type", { unique: false });
      }

      // Photo Queue store
      if (!db.objectStoreNames.contains(STORES.PHOTO_QUEUE)) {
        const photoStore = db.createObjectStore(STORES.PHOTO_QUEUE, {
          keyPath: "id",
        });
        photoStore.createIndex("orgId", "orgId", { unique: false });
        photoStore.createIndex("entityType", "entityType", { unique: false });
        photoStore.createIndex("entityId", "entityId", { unique: false });
        photoStore.createIndex("syncStatus", "syncStatus", { unique: false });
      }

      // Technician Schedule store
      if (!db.objectStoreNames.contains(STORES.TECHNICIAN_SCHEDULE)) {
        const scheduleStore = db.createObjectStore(STORES.TECHNICIAN_SCHEDULE, {
          keyPath: "id",
        });
        scheduleStore.createIndex("orgId", "orgId", { unique: false });
        scheduleStore.createIndex("technicianId", "technicianId", { unique: false });
        scheduleStore.createIndex("scheduledAt", "scheduledAt", { unique: false });
      }

      // Sync Queue store
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, {
          keyPath: "id",
        });
        syncStore.createIndex("orgId", "orgId", { unique: false });
        syncStore.createIndex("entityType", "entityType", { unique: false });
        syncStore.createIndex("syncStatus", "syncStatus", { unique: false });
        syncStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      logger.info("[indexeddb] Database schema upgraded", {
        version: DB_VERSION,
      });
    };
  });

  return dbPromise;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (dbPromise) {
    dbPromise.then((db) => db.close());
    dbPromise = null;
  }
}

// ============================================================================
// Generic CRUD Operations
// ============================================================================

/**
 * Get a single record by ID
 */
export async function getById<T>(
  storeName: StoreName,
  id: string
): Promise<T | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => {
      logger.error("[indexeddb] getById failed", {
        storeName,
        id,
        error: request.error,
      });
      reject(request.error);
    };
  });
}

/**
 * Get all records from a store
 */
export async function getAll<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => {
      logger.error("[indexeddb] getAll failed", {
        storeName,
        error: request.error,
      });
      reject(request.error);
    };
  });
}

/**
 * Get records by index
 */
export async function getByIndex<T>(
  storeName: StoreName,
  indexName: string,
  value: IDBValidKey
): Promise<T[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => {
      logger.error("[indexeddb] getByIndex failed", {
        storeName,
        indexName,
        value,
        error: request.error,
      });
      reject(request.error);
    };
  });
}

/**
 * Put (insert or update) a record
 */
export async function put<T>(storeName: StoreName, record: T): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.put(record);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      logger.error("[indexeddb] put failed", {
        storeName,
        error: request.error,
      });
      reject(request.error);
    };
  });
}

/**
 * Delete a record by ID
 */
export async function deleteById(
  storeName: StoreName,
  id: string
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      logger.error("[indexeddb] deleteById failed", {
        storeName,
        id,
        error: request.error,
      });
      reject(request.error);
    };
  });
}

/**
 * Clear all records from a store
 */
export async function clearStore(storeName: StoreName): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => {
      logger.info("[indexeddb] Store cleared", { storeName });
      resolve();
    };
    request.onerror = () => {
      logger.error("[indexeddb] clearStore failed", {
        storeName,
        error: request.error,
      });
      reject(request.error);
    };
  });
}

/**
 * Count records in a store
 */
export async function countRecords(storeName: StoreName): Promise<number> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    // eslint-disable-next-line local/require-tenant-scope -- CLIENT-SIDE: IndexedDB is inherently scoped by browser/device
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      logger.error("[indexeddb] countRecords failed", {
        storeName,
        error: request.error,
      });
      reject(request.error);
    };
  });
}

// ============================================================================
// Work Order Operations
// ============================================================================

/**
 * Cache work orders for offline access
 */
export async function cacheWorkOrders(
  workOrders: OfflineWorkOrder[]
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.WORK_ORDERS, "readwrite");
    const store = transaction.objectStore(STORES.WORK_ORDERS);

    let completed = 0;
    let hasError = false;

    for (const wo of workOrders) {
      const request = store.put({
        ...wo,
        cachedAt: new Date().toISOString(),
      });

      request.onsuccess = () => {
        completed++;
        if (completed === workOrders.length && !hasError) {
          logger.info("[indexeddb] Work orders cached", {
            count: workOrders.length,
          });
          resolve();
        }
      };

      request.onerror = () => {
        if (!hasError) {
          hasError = true;
          logger.error("[indexeddb] Failed to cache work order", {
            id: wo.id,
            error: request.error,
          });
          reject(request.error);
        }
      };
    }

    if (workOrders.length === 0) resolve();
  });
}

/**
 * Get work orders for a technician
 */
export async function getTechnicianWorkOrders(
  orgId: string,
  technicianId: string
): Promise<OfflineWorkOrder[]> {
  const allWorkOrders = await getByIndex<OfflineWorkOrder>(
    STORES.WORK_ORDERS,
    "orgId",
    orgId
  );
  return allWorkOrders.filter((wo) => wo.assignedTo === technicianId);
}

// ============================================================================
// Photo Queue Operations
// ============================================================================

/**
 * Queue a photo for offline upload
 */
export async function queuePhotoForUpload(
  photo: Omit<OfflinePhoto, "syncStatus" | "retryCount">
): Promise<void> {
  const record: OfflinePhoto = {
    ...photo,
    syncStatus: "pending",
    retryCount: 0,
  };
  await put(STORES.PHOTO_QUEUE, record);
  logger.info("[indexeddb] Photo queued for upload", {
    id: photo.id,
    entityType: photo.entityType,
    entityId: photo.entityId,
  });
}

/**
 * Get pending photos for sync
 */
export async function getPendingPhotos(): Promise<OfflinePhoto[]> {
  return getByIndex<OfflinePhoto>(STORES.PHOTO_QUEUE, "syncStatus", "pending");
}

/**
 * Update photo sync status
 */
export async function updatePhotoSyncStatus(
  id: string,
  status: OfflinePhoto["syncStatus"],
  error?: string
): Promise<void> {
  const photo = await getById<OfflinePhoto>(STORES.PHOTO_QUEUE, id);
  if (!photo) return;

  await put(STORES.PHOTO_QUEUE, {
    ...photo,
    syncStatus: status,
    syncError: error,
    retryCount: status === "failed" ? photo.retryCount + 1 : photo.retryCount,
  });
}

/**
 * Remove synced photos
 */
export async function cleanupSyncedPhotos(): Promise<number> {
  const synced = await getByIndex<OfflinePhoto>(
    STORES.PHOTO_QUEUE,
    "syncStatus",
    "synced"
  );
  for (const photo of synced) {
    await deleteById(STORES.PHOTO_QUEUE, photo.id);
  }
  logger.info("[indexeddb] Cleaned up synced photos", { count: synced.length });
  return synced.length;
}

// ============================================================================
// Sync Queue Operations
// ============================================================================

/**
 * Add item to sync queue
 */
export async function addToSyncQueue(
  item: Omit<SyncQueueItem, "syncStatus" | "retryCount" | "createdAt">
): Promise<void> {
  const record: SyncQueueItem = {
    ...item,
    createdAt: new Date().toISOString(),
    syncStatus: "pending",
    retryCount: 0,
  };
  await put(STORES.SYNC_QUEUE, record);
  logger.info("[indexeddb] Item added to sync queue", {
    id: item.id,
    entityType: item.entityType,
    action: item.action,
  });
}

/**
 * Get pending sync items
 */
export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  return getByIndex<SyncQueueItem>(STORES.SYNC_QUEUE, "syncStatus", "pending");
}

/**
 * Update sync item status
 */
export async function updateSyncItemStatus(
  id: string,
  status: SyncQueueItem["syncStatus"],
  error?: string
): Promise<void> {
  const item = await getById<SyncQueueItem>(STORES.SYNC_QUEUE, id);
  if (!item) return;

  await put(STORES.SYNC_QUEUE, {
    ...item,
    syncStatus: status,
    syncError: error,
    retryCount: status === "failed" ? item.retryCount + 1 : item.retryCount,
    lastAttempt: new Date().toISOString(),
  });
}

/**
 * Remove synced items from queue
 */
export async function cleanupSyncedItems(): Promise<number> {
  const synced = await getByIndex<SyncQueueItem>(
    STORES.SYNC_QUEUE,
    "syncStatus",
    "synced"
  );
  for (const item of synced) {
    await deleteById(STORES.SYNC_QUEUE, item.id);
  }
  logger.info("[indexeddb] Cleaned up synced items", { count: synced.length });
  return synced.length;
}

// ============================================================================
// Database Utilities
// ============================================================================

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

/**
 * Get database storage estimate
 */
export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
  percentUsed: number;
} | null> {
  if (!navigator.storage?.estimate) {
    return null;
  }

  const estimate = await navigator.storage.estimate();
  const usage = estimate.usage ?? 0;
  const quota = estimate.quota ?? 0;
  const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;

  return { usage, quota, percentUsed };
}

/**
 * Get sync status summary
 */
export async function getSyncStatusSummary(): Promise<{
  pendingWorkOrders: number;
  pendingPhotos: number;
  pendingSyncItems: number;
  failedItems: number;
}> {
  const [pendingPhotos, pendingSyncItems, failedPhotos, failedSyncItems] =
    await Promise.all([
      getByIndex<OfflinePhoto>(STORES.PHOTO_QUEUE, "syncStatus", "pending"),
      getByIndex<SyncQueueItem>(STORES.SYNC_QUEUE, "syncStatus", "pending"),
      getByIndex<OfflinePhoto>(STORES.PHOTO_QUEUE, "syncStatus", "failed"),
      getByIndex<SyncQueueItem>(STORES.SYNC_QUEUE, "syncStatus", "failed"),
    ]);

  return {
    pendingWorkOrders: 0, // Counted from localStorage queue
    pendingPhotos: pendingPhotos.length,
    pendingSyncItems: pendingSyncItems.length,
    failedItems: failedPhotos.length + failedSyncItems.length,
  };
}

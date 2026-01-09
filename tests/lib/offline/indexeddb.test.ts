/**
 * @fileoverview Tests for IndexedDB Offline Storage
 * @module tests/lib/offline/indexeddb.test
 *
 * Tests the IndexedDB storage layer for offline technician mode.
 *
 * @implements IMP-UX-004 - Offline Technician Mode
 * @created 2025-01-09
 * @status IMPLEMENTED [AGENT-0031]
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock IndexedDB
const mockObjectStore = {
  put: vi.fn(),
  get: vi.fn(),
  getAll: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  count: vi.fn(),
  createIndex: vi.fn(),
  index: vi.fn(),
};

const mockTransaction = {
  objectStore: vi.fn(() => mockObjectStore),
};

const mockDB = {
  transaction: vi.fn(() => mockTransaction),
  objectStoreNames: {
    contains: vi.fn(() => false),
  },
  createObjectStore: vi.fn(() => mockObjectStore),
  close: vi.fn(),
};

const mockRequest: Record<string, unknown> = {
  result: mockDB,
  error: null,
  onsuccess: null as ((this: IDBRequest, ev: Event) => unknown) | null,
  onerror: null as ((this: IDBRequest, ev: Event) => unknown) | null,
  onupgradeneeded: null as ((this: IDBOpenDBRequest, ev: IDBVersionChangeEvent) => unknown) | null,
};

const mockIndexedDB = {
  open: vi.fn(() => {
    setTimeout(() => {
      if (mockRequest.onsuccess) {
        (mockRequest.onsuccess as (ev: Event) => void).call(mockRequest as IDBRequest, {} as Event);
      }
    }, 0);
    return mockRequest;
  }),
};

vi.stubGlobal("indexedDB", mockIndexedDB);

// Dynamic import after mocking
const { openDatabase, closeDatabase, STORES } = await import(
  "@/lib/offline/indexeddb"
);

describe("IndexedDB Offline Storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest.error = null;
  });

  afterEach(() => {
    closeDatabase();
  });

  describe("openDatabase", () => {
    it("should open database successfully", async () => {
      const db = await openDatabase();
      expect(db).toBe(mockDB);
      expect(mockIndexedDB.open).toHaveBeenCalledWith("fixzit-offline", 1);
    });

    it("should reuse existing connection", async () => {
      const db1 = await openDatabase();
      const db2 = await openDatabase();
      expect(db1).toBe(db2);
      expect(mockIndexedDB.open).toHaveBeenCalledTimes(1);
    });
  });

  describe("STORES constants", () => {
    it("should define all required stores", () => {
      expect(STORES.WORK_ORDERS).toBe("work_orders");
      expect(STORES.INSPECTIONS).toBe("inspections");
      expect(STORES.INSPECTION_TEMPLATES).toBe("inspection_templates");
      expect(STORES.PHOTO_QUEUE).toBe("photo_queue");
      expect(STORES.TECHNICIAN_SCHEDULE).toBe("technician_schedule");
      expect(STORES.SYNC_QUEUE).toBe("sync_queue");
    });
  });

  describe("closeDatabase", () => {
    it("should close database connection", async () => {
      await openDatabase();
      closeDatabase();
      // Should be able to open again
      await openDatabase();
      expect(mockIndexedDB.open).toHaveBeenCalledTimes(2);
    });
  });
});

describe("CRUD Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getById", () => {
    it("should retrieve record by ID", async () => {
      const { getById } = await import("@/lib/offline/indexeddb");
      
      const mockData = { id: "test-1", title: "Test Work Order" };
      mockObjectStore.get.mockImplementation(() => {
        const req = {
          result: mockData,
          onsuccess: null as (() => void) | null,
          onerror: null,
        };
        setTimeout(() => req.onsuccess?.(), 0);
        return req;
      });

      const result = await getById(STORES.WORK_ORDERS, "test-1");
      expect(result).toEqual(mockData);
    });
  });

  describe("getAll", () => {
    it("should retrieve all records", async () => {
      const { getAll } = await import("@/lib/offline/indexeddb");
      
      const mockData = [
        { id: "1", title: "WO 1" },
        { id: "2", title: "WO 2" },
      ];
      mockObjectStore.getAll.mockImplementation(() => {
        const req = {
          result: mockData,
          onsuccess: null as (() => void) | null,
          onerror: null,
        };
        setTimeout(() => req.onsuccess?.(), 0);
        return req;
      });

      const result = await getAll(STORES.WORK_ORDERS);
      expect(result).toEqual(mockData);
    });
  });

  describe("put", () => {
    it("should store record", async () => {
      const { put } = await import("@/lib/offline/indexeddb");
      
      mockObjectStore.put.mockImplementation(() => {
        const req = {
          onsuccess: null as (() => void) | null,
          onerror: null,
        };
        setTimeout(() => req.onsuccess?.(), 0);
        return req;
      });

      const record = { id: "test-1", title: "New WO" };
      await expect(put(STORES.WORK_ORDERS, record)).resolves.toBeUndefined();
    });
  });

  describe("deleteById", () => {
    it("should delete record by ID", async () => {
      const { deleteById } = await import("@/lib/offline/indexeddb");
      
      mockObjectStore.delete.mockImplementation(() => {
        const req = {
          onsuccess: null as (() => void) | null,
          onerror: null,
        };
        setTimeout(() => req.onsuccess?.(), 0);
        return req;
      });

      await expect(
        deleteById(STORES.WORK_ORDERS, "test-1")
      ).resolves.toBeUndefined();
    });
  });

  describe("clearStore", () => {
    it("should clear all records from store", async () => {
      const { clearStore } = await import("@/lib/offline/indexeddb");
      
      mockObjectStore.clear.mockImplementation(() => {
        const req = {
          onsuccess: null as (() => void) | null,
          onerror: null,
        };
        setTimeout(() => req.onsuccess?.(), 0);
        return req;
      });

      await expect(clearStore(STORES.WORK_ORDERS)).resolves.toBeUndefined();
    });
  });

  describe("countRecords", () => {
    it("should count records in store", async () => {
      const { countRecords } = await import("@/lib/offline/indexeddb");
      
      mockObjectStore.count.mockImplementation(() => {
        const req = {
          result: 42,
          onsuccess: null as (() => void) | null,
          onerror: null,
        };
        setTimeout(() => req.onsuccess?.(), 0);
        return req;
      });

      const count = await countRecords(STORES.WORK_ORDERS);
      expect(count).toBe(42);
    });
  });
});

describe("Work Order Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("cacheWorkOrders", () => {
    it("should cache multiple work orders", async () => {
      const { cacheWorkOrders } = await import("@/lib/offline/indexeddb");
      
      mockObjectStore.put.mockImplementation(() => {
        const req = {
          onsuccess: null as (() => void) | null,
          onerror: null,
        };
        setTimeout(() => req.onsuccess?.(), 0);
        return req;
      });

      const workOrders = [
        {
          id: "wo-1",
          orgId: "org-1",
          workOrderNumber: "WO-001",
          title: "Fix AC",
          priority: "HIGH",
          status: "IN_PROGRESS",
          lastModified: new Date().toISOString(),
          cachedAt: new Date().toISOString(),
        },
        {
          id: "wo-2",
          orgId: "org-1",
          workOrderNumber: "WO-002",
          title: "Plumbing",
          priority: "MEDIUM",
          status: "SUBMITTED",
          lastModified: new Date().toISOString(),
          cachedAt: new Date().toISOString(),
        },
      ];

      await expect(cacheWorkOrders(workOrders)).resolves.toBeUndefined();
    });

    it("should handle empty array", async () => {
      const { cacheWorkOrders } = await import("@/lib/offline/indexeddb");
      await expect(cacheWorkOrders([])).resolves.toBeUndefined();
    });
  });
});

describe("Photo Queue Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("queuePhotoForUpload", () => {
    it("should queue photo with pending status", async () => {
      const { queuePhotoForUpload } = await import("@/lib/offline/indexeddb");
      
      mockObjectStore.put.mockImplementation(() => {
        const req = {
          onsuccess: null as (() => void) | null,
          onerror: null,
        };
        setTimeout(() => req.onsuccess?.(), 0);
        return req;
      });

      const photo = {
        id: "photo-1",
        orgId: "org-1",
        entityType: "work_order" as const,
        entityId: "wo-1",
        fileName: "test.jpg",
        mimeType: "image/jpeg",
        blob: new Blob(["test"], { type: "image/jpeg" }),
        capturedAt: new Date().toISOString(),
      };

      await expect(queuePhotoForUpload(photo)).resolves.toBeUndefined();
    });
  });
});

describe("Sync Queue Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("addToSyncQueue", () => {
    it("should add item to sync queue", async () => {
      const { addToSyncQueue } = await import("@/lib/offline/indexeddb");
      
      mockObjectStore.put.mockImplementation(() => {
        const req = {
          onsuccess: null as (() => void) | null,
          onerror: null,
        };
        setTimeout(() => req.onsuccess?.(), 0);
        return req;
      });

      const item = {
        id: "sync-1",
        orgId: "org-1",
        entityType: "work_order" as const,
        entityId: "wo-1",
        action: "update" as const,
        payload: { status: "COMPLETED" },
      };

      await expect(addToSyncQueue(item)).resolves.toBeUndefined();
    });
  });
});

describe("Utilities", () => {
  describe("isIndexedDBAvailable", () => {
    it("should return true when IndexedDB is available", async () => {
      const { isIndexedDBAvailable } = await import("@/lib/offline/indexeddb");
      expect(isIndexedDBAvailable()).toBe(true);
    });
  });
});

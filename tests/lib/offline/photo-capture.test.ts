/**
 * @fileoverview Tests for Offline Photo Capture Service
 * @module tests/lib/offline/photo-capture.test
 *
 * Tests the offline photo capture and sync functionality.
 *
 * @implements IMP-UX-004 - Offline Technician Mode
 * @created 2025-01-09
 * @status IMPLEMENTED [AGENT-0031]
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock IndexedDB functions
const mockIndexedDB = {
  queuePhotoForUpload: vi.fn(),
  getPendingPhotos: vi.fn(),
  updatePhotoSyncStatus: vi.fn(),
  cleanupSyncedPhotos: vi.fn(),
};

vi.mock("@/lib/offline/indexeddb", () => mockIndexedDB);

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock navigator
const mockNavigator = {
  onLine: true,
  geolocation: {
    getCurrentPosition: vi.fn((success) => {
      success({
        coords: {
          latitude: 24.7136,
          longitude: 46.6753,
          accuracy: 10,
        },
      });
    }),
  },
};

vi.stubGlobal("navigator", mockNavigator);

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("Offline Photo Capture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigator.onLine = true;
    mockIndexedDB.queuePhotoForUpload.mockResolvedValue(undefined);
    mockIndexedDB.getPendingPhotos.mockResolvedValue([]);
    mockIndexedDB.updatePhotoSyncStatus.mockResolvedValue(undefined);
    mockIndexedDB.cleanupSyncedPhotos.mockResolvedValue(0);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("capturePhoto", () => {
    it("should capture and queue a valid JPEG photo", async () => {
      const { capturePhoto } = await import("@/lib/offline/photo-capture");

      const file = new File(["test image data"], "test.jpg", {
        type: "image/jpeg",
      });

      const result = await capturePhoto(file, {
        entityType: "work_order",
        entityId: "wo-123",
        orgId: "org-123",
        photoType: "before",
      });

      expect(result.success).toBe(true);
      expect(result.photoId).toBeDefined();
      expect(result.photoId).toMatch(/^photo-\d+-[a-z0-9]+$/);
      expect(mockIndexedDB.queuePhotoForUpload).toHaveBeenCalled();
    });

    it("should capture PNG photos", async () => {
      const { capturePhoto } = await import("@/lib/offline/photo-capture");

      const file = new File(["png data"], "screenshot.png", {
        type: "image/png",
      });

      const result = await capturePhoto(file, {
        entityType: "inspection",
        entityId: "insp-456",
        orgId: "org-123",
        photoType: "finding",
      });

      expect(result.success).toBe(true);
    });

    it("should capture WebP photos", async () => {
      const { capturePhoto } = await import("@/lib/offline/photo-capture");

      const file = new File(["webp data"], "photo.webp", {
        type: "image/webp",
      });

      const result = await capturePhoto(file, {
        entityType: "work_order",
        entityId: "wo-789",
        orgId: "org-123",
      });

      expect(result.success).toBe(true);
    });

    it("should reject unsupported file types", async () => {
      const { capturePhoto } = await import("@/lib/offline/photo-capture");

      const file = new File(["pdf content"], "document.pdf", {
        type: "application/pdf",
      });

      const result = await capturePhoto(file, {
        entityType: "work_order",
        entityId: "wo-123",
        orgId: "org-123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unsupported file type");
    });

    it("should reject executable files", async () => {
      const { capturePhoto } = await import("@/lib/offline/photo-capture");

      const file = new File(["malware"], "virus.exe", {
        type: "application/x-msdownload",
      });

      const result = await capturePhoto(file, {
        entityType: "work_order",
        entityId: "wo-123",
        orgId: "org-123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unsupported file type");
    });

    it("should reject files that are too large", async () => {
      const { capturePhoto } = await import("@/lib/offline/photo-capture");

      // Create a mock file > 20MB
      const largeContent = new Array(25 * 1024 * 1024).fill("x").join("");
      const file = new File([largeContent], "huge.jpg", {
        type: "image/jpeg",
      });

      const result = await capturePhoto(file, {
        entityType: "work_order",
        entityId: "wo-123",
        orgId: "org-123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("too large");
    });

    it("should include geolocation when available", async () => {
      const { capturePhoto } = await import("@/lib/offline/photo-capture");

      const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

      await capturePhoto(file, {
        entityType: "work_order",
        entityId: "wo-123",
        orgId: "org-123",
        includeGeoLocation: true,
      });

      const call = mockIndexedDB.queuePhotoForUpload.mock.calls[0][0];
      expect(call.geoLocation).toBeDefined();
      expect(call.geoLocation.latitude).toBe(24.7136);
      expect(call.geoLocation.longitude).toBe(46.6753);
    });

    it("should indicate offline status when device is offline", async () => {
      const { capturePhoto } = await import("@/lib/offline/photo-capture");
      mockNavigator.onLine = false;

      const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

      const result = await capturePhoto(file, {
        entityType: "work_order",
        entityId: "wo-123",
        orgId: "org-123",
      });

      expect(result.success).toBe(true);
      expect(result.isOffline).toBe(true);
    });
  });

  describe("syncPhotos", () => {
    it("should sync pending photos when online", async () => {
      const { syncPhotos } = await import("@/lib/offline/photo-capture");

      const pendingPhoto = {
        id: "photo-1",
        orgId: "org-123",
        entityType: "work_order" as const,
        entityId: "wo-123",
        fileName: "test.jpg",
        mimeType: "image/jpeg",
        blob: new Blob(["test"], { type: "image/jpeg" }),
        capturedAt: new Date().toISOString(),
        syncStatus: "pending" as const,
        retryCount: 0,
      };

      mockIndexedDB.getPendingPhotos.mockResolvedValue([pendingPhoto]);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await syncPhotos();

      expect(result.synced).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockFetch).toHaveBeenCalled();
    });

    it("should not sync when offline", async () => {
      const { syncPhotos } = await import("@/lib/offline/photo-capture");
      mockNavigator.onLine = false;

      const result = await syncPhotos();

      expect(result.synced).toBe(0);
      expect(result.failed).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should handle failed uploads", async () => {
      const { syncPhotos } = await import("@/lib/offline/photo-capture");

      const pendingPhoto = {
        id: "photo-1",
        orgId: "org-123",
        entityType: "work_order" as const,
        entityId: "wo-123",
        fileName: "test.jpg",
        mimeType: "image/jpeg",
        blob: new Blob(["test"], { type: "image/jpeg" }),
        capturedAt: new Date().toISOString(),
        syncStatus: "pending" as const,
        retryCount: 0,
      };

      mockIndexedDB.getPendingPhotos.mockResolvedValue([pendingPhoto]);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      const result = await syncPhotos();

      expect(result.synced).toBe(0);
      expect(result.failed).toBe(1);
      expect(mockIndexedDB.updatePhotoSyncStatus).toHaveBeenCalledWith(
        "photo-1",
        "failed",
        expect.any(String)
      );
    });

    it("should skip photos that exceeded max retries", async () => {
      const { syncPhotos } = await import("@/lib/offline/photo-capture");

      const failedPhoto = {
        id: "photo-1",
        orgId: "org-123",
        entityType: "work_order" as const,
        entityId: "wo-123",
        fileName: "test.jpg",
        mimeType: "image/jpeg",
        blob: new Blob(["test"], { type: "image/jpeg" }),
        capturedAt: new Date().toISOString(),
        syncStatus: "pending" as const,
        retryCount: 5, // Exceeds MAX_RETRY_COUNT of 3
      };

      mockIndexedDB.getPendingPhotos.mockResolvedValue([failedPhoto]);

      const result = await syncPhotos();

      expect(result.failed).toBe(1);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should cleanup synced photos", async () => {
      const { syncPhotos } = await import("@/lib/offline/photo-capture");

      const pendingPhoto = {
        id: "photo-1",
        orgId: "org-123",
        entityType: "work_order" as const,
        entityId: "wo-123",
        fileName: "test.jpg",
        mimeType: "image/jpeg",
        blob: new Blob(["test"], { type: "image/jpeg" }),
        capturedAt: new Date().toISOString(),
        syncStatus: "pending" as const,
        retryCount: 0,
      };

      mockIndexedDB.getPendingPhotos.mockResolvedValue([pendingPhoto]);
      mockFetch.mockResolvedValue({ ok: true });

      await syncPhotos();

      expect(mockIndexedDB.cleanupSyncedPhotos).toHaveBeenCalled();
    });
  });

  describe("background sync", () => {
    it("should start and stop background sync", async () => {
      const { startPhotoSync, stopPhotoSync } = await import(
        "@/lib/offline/photo-capture"
      );

      // Should not throw
      startPhotoSync();
      stopPhotoSync();
    });
  });

  describe("utilities", () => {
    it("should report photo capture availability", async () => {
      const { isPhotoCaptureAvailable } = await import(
        "@/lib/offline/photo-capture"
      );

      // Should return true in test environment with mocks
      const available = isPhotoCaptureAvailable();
      expect(typeof available).toBe("boolean");
    });

    it("should get pending photo count", async () => {
      const { getPendingPhotoCount } = await import(
        "@/lib/offline/photo-capture"
      );

      mockIndexedDB.getPendingPhotos.mockResolvedValue([
        { id: "1" },
        { id: "2" },
        { id: "3" },
      ]);

      const count = await getPendingPhotoCount();
      expect(count).toBe(3);
    });
  });
});

describe("Photo Capture Options", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigator.onLine = true;
    mockIndexedDB.queuePhotoForUpload.mockResolvedValue(undefined);
    mockIndexedDB.getPendingPhotos.mockResolvedValue([]);
  });

  it("should store caption when provided", async () => {
    const { capturePhoto } = await import("@/lib/offline/photo-capture");

    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

    await capturePhoto(file, {
      entityType: "inspection",
      entityId: "insp-1",
      orgId: "org-123",
      caption: "Damage to wall near entrance",
    });

    const call = mockIndexedDB.queuePhotoForUpload.mock.calls[0][0];
    expect(call.caption).toBe("Damage to wall near entrance");
  });

  it("should store photo type", async () => {
    const { capturePhoto } = await import("@/lib/offline/photo-capture");

    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

    await capturePhoto(file, {
      entityType: "work_order",
      entityId: "wo-1",
      orgId: "org-123",
      photoType: "after",
    });

    const call = mockIndexedDB.queuePhotoForUpload.mock.calls[0][0];
    expect(call.photoType).toBe("after");
  });

  it("should skip geolocation when disabled", async () => {
    const { capturePhoto } = await import("@/lib/offline/photo-capture");

    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

    await capturePhoto(file, {
      entityType: "work_order",
      entityId: "wo-1",
      orgId: "org-123",
      includeGeoLocation: false,
    });

    expect(mockNavigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
  });
});

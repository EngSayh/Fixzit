/**
 * @fileoverview Offline Photo Capture Service
 * @module lib/offline/photo-capture
 *
 * Provides offline-first photo capture for technicians in the field.
 * Photos are stored in IndexedDB and synced when connectivity returns.
 *
 * Features:
 * - Capture photos from camera or file picker
 * - Store in IndexedDB with blob support
 * - Geolocation tagging
 * - Automatic sync when online
 * - Retry logic for failed uploads
 *
 * @implements IMP-UX-004 - Offline Technician Mode
 * @created 2025-01-09
 * @status IMPLEMENTED [AGENT-0031]
 */

import { logger } from "@/lib/logger";
import {
  queuePhotoForUpload,
  getPendingPhotos,
  updatePhotoSyncStatus,
  cleanupSyncedPhotos,
  type OfflinePhoto,
} from "./indexeddb";

// ============================================================================
// Constants
// ============================================================================

const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_RETRY_COUNT = 3;
const SYNC_INTERVAL_MS = 30000; // 30 seconds

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

// ============================================================================
// Types
// ============================================================================

export interface PhotoCaptureOptions {
  entityType: "work_order" | "inspection";
  entityId: string;
  orgId: string;
  photoType?: "before" | "after" | "finding" | "attachment";
  caption?: string;
  includeGeoLocation?: boolean;
}

export interface PhotoCaptureResult {
  success: boolean;
  photoId?: string;
  error?: string;
  isOffline?: boolean;
}

export interface PhotoSyncResult {
  synced: number;
  failed: number;
  remaining: number;
}

// ============================================================================
// Photo Capture
// ============================================================================

/**
 * Generate a unique ID for offline photos
 */
function generatePhotoId(): string {
  return `photo-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Get current geolocation if available
 */
async function getCurrentLocation(): Promise<OfflinePhoto["geoLocation"] | undefined> {
  if (!navigator.geolocation) {
    return undefined;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        logger.warn("[photo-capture] Geolocation failed", { error: error.message });
        resolve(undefined);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60000, // Use cached location up to 1 minute old
      }
    );
  });
}

/**
 * Compress image if needed
 */
async function compressImageIfNeeded(
  blob: Blob,
  maxSizeBytes: number = MAX_PHOTO_SIZE_BYTES
): Promise<Blob> {
  if (blob.size <= maxSizeBytes) {
    return blob;
  }

  // Create image from blob
  const imageBitmap = await createImageBitmap(blob);
  
  // Calculate scale factor to reduce size
  const scaleFactor = Math.sqrt(maxSizeBytes / blob.size) * 0.9;
  const newWidth = Math.floor(imageBitmap.width * scaleFactor);
  const newHeight = Math.floor(imageBitmap.height * scaleFactor);

  // Draw to canvas
  const canvas = new OffscreenCanvas(newWidth, newHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }
  
  ctx.drawImage(imageBitmap, 0, 0, newWidth, newHeight);
  
  // Convert back to blob with compression
  const compressedBlob = await canvas.convertToBlob({
    type: "image/jpeg",
    quality: 0.8,
  });

  logger.info("[photo-capture] Image compressed", {
    originalSize: blob.size,
    compressedSize: compressedBlob.size,
    scaleFactor,
  });

  return compressedBlob;
}

/**
 * Capture and store a photo for offline sync
 */
export async function capturePhoto(
  file: File,
  options: PhotoCaptureOptions
): Promise<PhotoCaptureResult> {
  try {
    // Validate file type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return {
        success: false,
        error: `Unsupported file type: ${file.type}. Allowed: JPEG, PNG, WebP, HEIC`,
      };
    }

    // Validate file size (after potential compression)
    if (file.size > MAX_PHOTO_SIZE_BYTES * 2) {
      return {
        success: false,
        error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 20MB`,
      };
    }

    // Compress if needed
    let blob: Blob = file;
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      blob = await compressImageIfNeeded(file);
    }

    // Get geolocation if requested
    let geoLocation: OfflinePhoto["geoLocation"] | undefined;
    if (options.includeGeoLocation !== false) {
      geoLocation = await getCurrentLocation();
    }

    // Generate photo ID
    const photoId = generatePhotoId();

    // Queue for upload
    await queuePhotoForUpload({
      id: photoId,
      orgId: options.orgId,
      entityType: options.entityType,
      entityId: options.entityId,
      fileName: file.name,
      mimeType: blob.type || file.type,
      blob,
      caption: options.caption,
      photoType: options.photoType,
      geoLocation,
      capturedAt: new Date().toISOString(),
    });

    // Check if online and trigger immediate sync
    const isOnline = typeof navigator !== "undefined" && navigator.onLine;
    if (isOnline) {
      // Trigger async sync (don't wait)
      void syncPhotos().catch((err) => {
        logger.warn("[photo-capture] Background sync failed", { error: err });
      });
    }

    logger.info("[photo-capture] Photo captured successfully", {
      photoId,
      entityType: options.entityType,
      entityId: options.entityId,
      size: blob.size,
      isOnline,
    });

    return {
      success: true,
      photoId,
      isOffline: !isOnline,
    };
  } catch (error) {
    logger.error("[photo-capture] Failed to capture photo", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to capture photo",
    };
  }
}

// ============================================================================
// Photo Sync
// ============================================================================

let syncInProgress = false;

/**
 * Sync pending photos to the server
 */
export async function syncPhotos(): Promise<PhotoSyncResult> {
  if (syncInProgress) {
    return { synced: 0, failed: 0, remaining: 0 };
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, failed: 0, remaining: 0 };
  }

  syncInProgress = true;
  let synced = 0;
  let failed = 0;

  try {
    const pendingPhotos = await getPendingPhotos();
    
    for (const photo of pendingPhotos) {
      // Skip if max retries exceeded
      if (photo.retryCount >= MAX_RETRY_COUNT) {
        failed++;
        continue;
      }

      try {
        await updatePhotoSyncStatus(photo.id, "syncing");
        
        // Prepare form data for upload
        const formData = new FormData();
        formData.append("file", photo.blob, photo.fileName);
        formData.append("entityType", photo.entityType);
        formData.append("entityId", photo.entityId);
        if (photo.caption) formData.append("caption", photo.caption);
        if (photo.photoType) formData.append("type", photo.photoType);
        if (photo.geoLocation) {
          formData.append("geoLocation", JSON.stringify(photo.geoLocation));
        }

        // Determine upload URL based on entity type
        const uploadUrl =
          photo.entityType === "work_order"
            ? `/api/fm/work-orders/${photo.entityId}/attachments`
            : `/api/fm/inspections/${photo.entityId}/photos`;

        const response = await fetch(uploadUrl, {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `Upload failed: ${response.status}`);
        }

        await updatePhotoSyncStatus(photo.id, "synced");
        synced++;

        logger.info("[photo-capture] Photo synced successfully", {
          photoId: photo.id,
          entityType: photo.entityType,
          entityId: photo.entityId,
        });
      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : "Sync failed";
        await updatePhotoSyncStatus(photo.id, "failed", errorMessage);
        
        logger.error("[photo-capture] Photo sync failed", {
          photoId: photo.id,
          error: errorMessage,
          retryCount: photo.retryCount + 1,
        });
      }
    }

    // Cleanup synced photos
    if (synced > 0) {
      await cleanupSyncedPhotos();
    }

    const remainingPhotos = await getPendingPhotos();
    return {
      synced,
      failed,
      remaining: remainingPhotos.length,
    };
  } finally {
    syncInProgress = false;
  }
}

// ============================================================================
// Background Sync
// ============================================================================

let syncIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Start background photo sync
 */
export function startPhotoSync(): void {
  if (syncIntervalId) return;

  // Initial sync
  void syncPhotos().catch((err) => {
    logger.warn("[photo-capture] Initial sync failed", { error: err });
  });

  // Set up interval
  syncIntervalId = setInterval(() => {
    if (typeof navigator !== "undefined" && navigator.onLine) {
      void syncPhotos().catch((err) => {
        logger.warn("[photo-capture] Periodic sync failed", { error: err });
      });
    }
  }, SYNC_INTERVAL_MS);

  // Listen for online event
  if (typeof window !== "undefined") {
    window.addEventListener("online", handleOnline);
  }

  logger.info("[photo-capture] Background sync started", {
    intervalMs: SYNC_INTERVAL_MS,
  });
}

/**
 * Stop background photo sync
 */
export function stopPhotoSync(): void {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }

  if (typeof window !== "undefined") {
    window.removeEventListener("online", handleOnline);
  }

  logger.info("[photo-capture] Background sync stopped");
}

/**
 * Handle online event
 */
function handleOnline(): void {
  logger.info("[photo-capture] Device online, triggering sync");
  void syncPhotos().catch((err) => {
    logger.warn("[photo-capture] Online sync failed", { error: err });
  });
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Get count of pending photos
 */
export async function getPendingPhotoCount(): Promise<number> {
  const pending = await getPendingPhotos();
  return pending.length;
}

/**
 * Check if photo capture is available
 */
export function isPhotoCaptureAvailable(): boolean {
  return (
    typeof indexedDB !== "undefined" &&
    typeof Blob !== "undefined" &&
    typeof FormData !== "undefined"
  );
}

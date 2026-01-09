/**
 * @fileoverview Offline Photo Capture Hook
 * @module hooks/fm/useOfflinePhotoCapture
 *
 * React hook for managing offline photo capture in field service apps.
 * Integrates with IndexedDB storage and provides sync status.
 *
 * @implements IMP-UX-004 - Offline Technician Mode
 * @created 2025-01-09
 * @status IMPLEMENTED [AGENT-0031]
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useOnlineStatus } from "@/components/common/OfflineIndicator";
import { logger } from "@/lib/logger";
import {
  capturePhoto,
  syncPhotos,
  startPhotoSync,
  stopPhotoSync,
  getPendingPhotoCount,
  isPhotoCaptureAvailable,
  type PhotoCaptureOptions,
  type PhotoCaptureResult,
  type PhotoSyncResult,
} from "@/lib/offline/photo-capture";

// ============================================================================
// Types
// ============================================================================

export interface UseOfflinePhotoCaptureOptions {
  /** Organization ID for the current user */
  orgId: string;
  /** Auto-start background sync on mount */
  autoSync?: boolean;
  /** Callback when sync completes */
  onSyncComplete?: (result: PhotoSyncResult) => void;
}

export interface UseOfflinePhotoCaptureReturn {
  /** Whether the feature is available (IndexedDB support) */
  isAvailable: boolean;
  /** Whether the device is online */
  isOnline: boolean;
  /** Number of photos pending sync */
  pendingCount: number;
  /** Whether a sync is in progress */
  isSyncing: boolean;
  /** Capture a photo and queue for upload */
  capture: (
    file: File,
    options: Omit<PhotoCaptureOptions, "orgId">
  ) => Promise<PhotoCaptureResult>;
  /** Manually trigger photo sync */
  sync: () => Promise<PhotoSyncResult>;
  /** Refresh pending count */
  refreshPendingCount: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useOfflinePhotoCapture(
  options: UseOfflinePhotoCaptureOptions
): UseOfflinePhotoCaptureReturn {
  const { orgId, autoSync = true, onSyncComplete } = options;
  const { isOnline } = useOnlineStatus();
  
  const [isAvailable] = useState(() => isPhotoCaptureAvailable());
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Refresh pending count
  const refreshPendingCount = useCallback(async () => {
    if (!isAvailable) return;
    try {
      const count = await getPendingPhotoCount();
      setPendingCount(count);
    } catch (error) {
      logger.warn("[useOfflinePhotoCapture] Failed to get pending count", {
        error,
      });
    }
  }, [isAvailable]);

  // Capture photo
  const capture = useCallback(
    async (
      file: File,
      captureOptions: Omit<PhotoCaptureOptions, "orgId">
    ): Promise<PhotoCaptureResult> => {
      if (!isAvailable) {
        return {
          success: false,
          error: "Offline photo capture is not available in this browser",
        };
      }

      const result = await capturePhoto(file, {
        ...captureOptions,
        orgId,
      });

      // Refresh pending count after capture
      await refreshPendingCount();

      return result;
    },
    [isAvailable, orgId, refreshPendingCount]
  );

  // Manual sync
  const sync = useCallback(async (): Promise<PhotoSyncResult> => {
    if (!isAvailable || isSyncing) {
      return { synced: 0, failed: 0, remaining: pendingCount };
    }

    setIsSyncing(true);
    try {
      const result = await syncPhotos();
      onSyncComplete?.(result);
      await refreshPendingCount();
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [isAvailable, isSyncing, pendingCount, onSyncComplete, refreshPendingCount]);

  // Auto-sync setup
  useEffect(() => {
    if (!isAvailable || !autoSync) return;

    // Start background sync
    startPhotoSync();

    // Initial pending count
    void refreshPendingCount();

    return () => {
      stopPhotoSync();
    };
  }, [isAvailable, autoSync, refreshPendingCount]);

  // Sync when coming online
  useEffect(() => {
    if (!isAvailable || !isOnline || pendingCount === 0) return;

    logger.info("[useOfflinePhotoCapture] Online with pending photos, syncing");
    void sync();
  }, [isAvailable, isOnline, pendingCount, sync]);

  return {
    isAvailable,
    isOnline,
    pendingCount,
    isSyncing,
    capture,
    sync,
    refreshPendingCount,
  };
}

export default useOfflinePhotoCapture;

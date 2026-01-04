"use client";

/**
 * useDraftManager Hook
 * 
 * Provides per-page draft management that integrates with the VersionMonitor.
 * Automatically saves form state as drafts when:
 * - User navigates away (beforeunload)
 * - New version is detected (version update event)
 * - Periodic auto-save interval
 * 
 * @module hooks/useDraftManager
 */

import { useEffect, useCallback, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useVersionMonitor, type DraftData } from "@/contexts/VersionMonitorContext";
import { logger } from "@/lib/logger";

// Auto-save interval (30 seconds)
const AUTO_SAVE_INTERVAL_MS = 30_000;

export interface UseDraftManagerOptions {
  /** Unique page/form identifier. Defaults to current pathname. */
  pageId?: string;
  
  /** Enable auto-save on interval. Default: true */
  autoSave?: boolean;
  
  /** Auto-save interval in ms. Default: 30000 */
  autoSaveInterval?: number;
  
  /** Callback when draft is loaded (for restoring state) */
  onDraftLoaded?: (draft: DraftData) => void;
  
  /** Callback before draft is saved (to collect current state) */
  onBeforeSave?: () => Record<string, unknown>;
  
  /** Whether to show notification when draft is restored */
  showRestoreNotification?: boolean;
}

export interface UseDraftManagerReturn {
  /** Whether a draft exists for this page */
  hasDraft: boolean;
  
  /** The loaded draft data (if any) */
  draft: DraftData | null;
  
  /** Manually save current state as draft */
  saveDraft: (data?: Record<string, unknown>) => void;
  
  /** Clear the draft for this page */
  clearDraft: () => void;
  
  /** Restore draft data (calls onDraftLoaded) */
  restoreDraft: () => void;
  
  /** Dismiss draft without restoring */
  dismissDraft: () => void;
  
  /** Last save timestamp */
  lastSaved: Date | null;
  
  /** Whether draft is being saved */
  isSaving: boolean;
}

export function useDraftManager(options: UseDraftManagerOptions = {}): UseDraftManagerReturn {
  const pathname = usePathname();
  const versionMonitor = useVersionMonitor();
  
  const {
    pageId = pathname || "unknown",
    autoSave = true,
    autoSaveInterval = AUTO_SAVE_INTERVAL_MS,
    onDraftLoaded,
    onBeforeSave,
    showRestoreNotification = true,
  } = options;
  
  const [draft, setDraft] = useState<DraftData | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const onBeforeSaveRef = useRef(onBeforeSave);
  const onDraftLoadedRef = useRef(onDraftLoaded);
  
  // Keep refs updated
  useEffect(() => {
    onBeforeSaveRef.current = onBeforeSave;
    onDraftLoadedRef.current = onDraftLoaded;
  }, [onBeforeSave, onDraftLoaded]);
  
  // Load draft on mount
  useEffect(() => {
    const loadedDraft = versionMonitor.loadDraft(pageId);
    if (loadedDraft) {
      setDraft(loadedDraft);
      setHasDraft(true);
      
      if (showRestoreNotification) {
        logger.info("[DraftManager] Draft found", {
          pageId,
          savedAt: new Date(loadedDraft.timestamp).toISOString(),
        });
      }
    }
  }, [pageId, versionMonitor, showRestoreNotification]);
  
  // Save draft function
  const saveDraft = useCallback((data?: Record<string, unknown>) => {
    setIsSaving(true);
    
    try {
      const dataToSave = data || onBeforeSaveRef.current?.() || {};
      
      // Don't save empty data
      if (Object.keys(dataToSave).length === 0) {
        setIsSaving(false);
        return;
      }
      
      versionMonitor.saveDraft(pageId, dataToSave);
      setLastSaved(new Date());
      
      logger.debug("[DraftManager] Draft saved", { pageId });
    } catch (error) {
      logger.error("[DraftManager] Failed to save draft", { pageId, error });
    } finally {
      setIsSaving(false);
    }
  }, [pageId, versionMonitor]);
  
  // Clear draft function
  const clearDraft = useCallback(() => {
    versionMonitor.clearDraft(pageId);
    setDraft(null);
    setHasDraft(false);
    logger.debug("[DraftManager] Draft cleared", { pageId });
  }, [pageId, versionMonitor]);
  
  // Restore draft function
  const restoreDraft = useCallback(() => {
    if (draft && onDraftLoadedRef.current) {
      onDraftLoadedRef.current(draft);
      logger.info("[DraftManager] Draft restored", { pageId });
    }
  }, [draft, pageId]);
  
  // Dismiss draft without restoring
  const dismissDraft = useCallback(() => {
    clearDraft();
    logger.info("[DraftManager] Draft dismissed", { pageId });
  }, [clearDraft, pageId]);
  
  // Auto-save on interval
  useEffect(() => {
    if (!autoSave) return;
    
    const interval = setInterval(() => {
      if (onBeforeSaveRef.current) {
        const data = onBeforeSaveRef.current();
        if (data && Object.keys(data).length > 0) {
          saveDraft(data);
        }
      }
    }, autoSaveInterval);
    
    return () => clearInterval(interval);
  }, [autoSave, autoSaveInterval, saveDraft]);
  
  // Save on version update event
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const handleVersionUpdate = () => {
      if (onBeforeSaveRef.current) {
        const data = onBeforeSaveRef.current();
        if (data && Object.keys(data).length > 0) {
          saveDraft(data);
        }
      }
    };
    
    window.addEventListener("fixzit:version-update", handleVersionUpdate);
    window.addEventListener("fixzit:force-reload", handleVersionUpdate);
    
    return () => {
      window.removeEventListener("fixzit:version-update", handleVersionUpdate);
      window.removeEventListener("fixzit:force-reload", handleVersionUpdate);
    };
  }, [saveDraft]);
  
  // Save on beforeunload
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const handleBeforeUnload = () => {
      if (onBeforeSaveRef.current) {
        const data = onBeforeSaveRef.current();
        if (data && Object.keys(data).length > 0) {
          // Use synchronous storage for beforeunload
          try {
            const draftData = {
              id: pageId,
              path: window.location.pathname,
              timestamp: Date.now(),
              expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
              data,
            };
            localStorage.setItem(`fixzit:draft:${pageId}`, JSON.stringify(draftData));
          } catch {
            // Ignore storage errors in beforeunload
          }
        }
      }
    };
    
    window.addEventListener("beforeunload", handleBeforeUnload);
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [pageId]);
  
  return {
    hasDraft,
    draft,
    saveDraft,
    clearDraft,
    restoreDraft,
    dismissDraft,
    lastSaved,
    isSaving,
  };
}

export default useDraftManager;

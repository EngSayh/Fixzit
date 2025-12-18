/**
 * Offline Indicator Component
 * 
 * Displays a banner when the user is offline.
 * Uses navigator.onLine API with event listeners for real-time updates.
 * 
 * @module components/common/OfflineIndicator
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/TranslationContext";

interface OfflineIndicatorProps {
  /** Position of the indicator */
  position?: "top" | "bottom";
  /** Whether to show a reconnection message briefly after coming back online */
  showReconnectedMessage?: boolean;
  /** Duration (ms) to show the reconnected message */
  reconnectedMessageDuration?: number;
  /** Additional CSS classes */
  className?: string;
}

export function OfflineIndicator({
  position = "top",
  showReconnectedMessage = true,
  reconnectedMessageDuration = 3000,
  className,
}: OfflineIndicatorProps) {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);
  const reconnectedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Initialize with current status
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);

    const handleOnline = () => {
      setIsOnline(true);
      if (showReconnectedMessage) {
        // Clear any existing timeout before scheduling a new one
        if (reconnectedTimeoutRef.current) {
          clearTimeout(reconnectedTimeoutRef.current);
        }
        setShowReconnected(true);
        reconnectedTimeoutRef.current = setTimeout(() => {
          setShowReconnected(false);
          reconnectedTimeoutRef.current = null;
        }, reconnectedMessageDuration);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
      // Clear timeout when going offline
      if (reconnectedTimeoutRef.current) {
        clearTimeout(reconnectedTimeoutRef.current);
        reconnectedTimeoutRef.current = null;
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      // Clean up timeout on unmount
      if (reconnectedTimeoutRef.current) {
        clearTimeout(reconnectedTimeoutRef.current);
      }
    };
  }, [showReconnectedMessage, reconnectedMessageDuration]);

  // Don't render if online and not showing reconnected message
  if (isOnline && !showReconnected) {
    return null;
  }

  const positionClasses = position === "top" 
    ? "top-0 left-0 right-0" 
    : "bottom-0 left-0 right-0";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed z-50 px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium transition-all duration-300",
        positionClasses,
        isOnline && showReconnected
          ? "bg-[#00A859] text-white" // Fixzit Green brand token
          : "bg-destructive text-destructive-foreground",
        className
      )}
    >
      {isOnline && showReconnected ? (
        <>
          <Wifi className="w-4 h-4 me-1" aria-hidden="true" />
          <span>{t("common.offline.backOnline", "You're back online!")}</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 me-1" aria-hidden="true" />
          <span>{t("common.offline.offline", "You're offline. Some features may be unavailable.")}</span>
        </>
      )}
    </div>
  );
}

/**
 * Hook to check online status
 * 
 * @returns {{ isOnline: boolean }} Current online status
 */
export function useOnlineStatus(): { isOnline: boolean } {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline };
}

"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/contexts/TranslationContext";
import { WifiOff } from "lucide-react";

/**
 * Hook to track online/offline status
 */
export function useOnlineStatus(): { isOnline: boolean } {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Check initial status
    setIsOnline(navigator.onLine);

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

/**
 * Visual indicator when the user is offline
 * - Uses role="status" for screen readers (polite announcement)
 * - RTL-safe spacing with me-1 class
 * - i18n keys: common.offline.offline, common.offline.backOnline
 * - Supports position prop for top/bottom placement
 */
interface OfflineIndicatorProps {
  position?: "top" | "bottom";
}

export function OfflineIndicator({ position = "bottom" }: OfflineIndicatorProps): JSX.Element | null {
  const { isOnline } = useOnlineStatus();
  const { t } = useTranslation();

  if (isOnline) return null;

  const positionClasses = position === "top" 
    ? "top-0" 
    : "bottom-0";

  return (
    <div
      className={`fixed ${positionClasses} left-1/2 -translate-x-1/2 z-50 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg shadow-lg flex items-center`}
      role="status"
      aria-live="polite"
    >
      <WifiOff className="w-5 h-5 me-1" aria-hidden="true" />
      <span className="font-medium">
        {t("common.offline.offline", "You're offline. Some features may be unavailable.")}
      </span>
    </div>
  );
}

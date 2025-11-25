"use client";

import { useState, useEffect, useCallback } from "react";
// 🟨 FIXED: Import the existing debounce hook
import { useDebounceCallback } from "./useDebounce";

export type ScreenSize = "mobile" | "tablet" | "desktop" | "large";

export interface ScreenInfo {
  width: number;
  height: number;
  size: ScreenSize;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLarge: boolean;
  isSmall: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  devicePixelRatio: number;
  isTouchDevice: boolean;
  isHighResolution: boolean;
}

const getScreenSize = (width: number): ScreenSize => {
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  if (width < 1280) return "desktop";
  return "large";
};

const getScreenInfo = (): ScreenInfo => {
  const width = typeof window !== "undefined" ? window.innerWidth : 1024;
  const height = typeof window !== "undefined" ? window.innerHeight : 768;
  const size = getScreenSize(width);
  const devicePixelRatio =
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const isTouchDevice =
    typeof window !== "undefined" ? "ontouchstart" in window : false;

  return {
    width,
    height,
    size,
    isMobile: size === "mobile",
    isTablet: size === "tablet",
    isDesktop: size === "desktop",
    isLarge: size === "large",
    isSmall: width < 768,
    isPortrait: height > width,
    isLandscape: width >= height,
    devicePixelRatio,
    isTouchDevice,
    isHighResolution: devicePixelRatio > 1,
  };
};

/**
 * Tracks viewport dimensions/orientation and exposes a rich `ScreenInfo` object
 * along with a ready flag. Updates are debounced to prevent rapid re-renders
 * during resize/rotation events.
 */
export function useScreenSize() {
  const [screenInfo, setScreenInfo] = useState<ScreenInfo>(() =>
    getScreenInfo(),
  );
  const [isReady, setIsReady] = useState(false);

  // Memoize the update function
  const updateScreenInfo = useCallback(() => {
    setScreenInfo(getScreenInfo());
  }, []);

  // 🟨 FIXED: Use the existing useDebounceCallback hook
  const debouncedUpdateScreenInfo = useDebounceCallback(updateScreenInfo, 150);

  useEffect(() => {
    // Guard for SSR
    if (typeof window === "undefined") {
      return;
    }

    // Set initial screen info on mount
    updateScreenInfo();
    setIsReady(true);

    window.addEventListener("resize", debouncedUpdateScreenInfo);
    window.addEventListener("orientationchange", updateScreenInfo);
    window.addEventListener("load", updateScreenInfo);

    return () => {
      window.removeEventListener("resize", debouncedUpdateScreenInfo);
      window.removeEventListener("orientationchange", updateScreenInfo);
      window.removeEventListener("load", updateScreenInfo);
    };
  }, [debouncedUpdateScreenInfo, updateScreenInfo]);

  return { screenInfo, isReady, updateScreenInfo };
}

/**
 * Returns a set of utility classes derived from the current screen info so
 * components can stay responsive without duplicating breakpoint logic.
 */
export function getResponsiveClasses(screenInfo: ScreenInfo) {
  const { size, isMobile, isTablet, isDesktop } = screenInfo;

  return {
    // Container classes
    container: {
      mobile: "max-w-sm mx-auto px-4",
      tablet: "max-w-2xl mx-auto px-6",
      desktop: "max-w-6xl mx-auto px-8",
      large: "max-w-7xl mx-auto px-8",
    }[size],

    // Grid classes
    grid: {
      mobile: "grid-cols-1",
      tablet: "grid-cols-1 md:grid-cols-2",
      desktop: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
      large: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    }[size],

    // Text sizes
    text: {
      mobile: "text-sm",
      tablet: "text-base",
      desktop: "text-base",
      large: "text-lg",
    }[size],

    // Spacing
    spacing: {
      mobile: "space-y-2",
      tablet: "space-y-4",
      desktop: "space-y-6",
      large: "space-y-8",
    }[size],

    // Sidebar visibility
    sidebarVisible: !isMobile && !isTablet,

    // Mobile-specific adjustments
    mobileOptimizations: isMobile ? "touch-manipulation" : "",
    tabletOptimizations: isTablet ? "scroll-smooth" : "",
    desktopOptimizations: isDesktop ? "hover:shadow-lg" : "",
  };
}

'use client&apos;;

import React, { createContext, useContext, ReactNode } from &apos;react&apos;;
import { useScreenSize, ScreenInfo, getResponsiveClasses } from &apos;@/src/hooks/useScreenSize&apos;;

interface ResponsiveContextType {
  screenInfo: ScreenInfo;
  isReady: boolean;
  responsiveClasses: ReturnType<typeof getResponsiveClasses>;
  isRTL: boolean;
  updateScreenInfo: () => void;
}

const ResponsiveContext = createContext<ResponsiveContextType | undefined>(undefined);

export function ResponsiveProvider({ children }: { children: ReactNode }) {
  const { screenInfo, isReady, updateScreenInfo } = useScreenSize();

  const responsiveClasses = getResponsiveClasses(screenInfo);

  const value = {
    screenInfo,
    isReady,
    responsiveClasses,
    // isRTL will be available when used in components with useResponsive hook
    isRTL: false, // This will be overridden in the useResponsive hook
    updateScreenInfo
  };

  return (
    <ResponsiveContext.Provider value={value}>
      {children}
    </ResponsiveContext.Provider>
  );
}

export function useResponsiveContext() {
  const context = useContext(ResponsiveContext);
  if (context === undefined) {
    throw new Error(&apos;useResponsiveContext must be used within a ResponsiveProvider&apos;);
  }
  return context;
}

// Convenience hook that combines both screen size and responsive context
export function useResponsive() {
  const context = useContext(ResponsiveContext);

  if (!context) {
    // Fallback when context is not available
    return {
      screenInfo: {
        width: 1024,
        height: 768,
        size: &apos;desktop&apos; as const,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isLarge: false,
        isSmall: false,
        isPortrait: false,
        isLandscape: true,
        devicePixelRatio: 1,
        isTouchDevice: false,
        isHighResolution: false
      },
      isReady: true,
      isRTL: false,
      responsiveClasses: {
        container: &apos;max-w-6xl mx-auto px-8&apos;,
        grid: &apos;grid-cols-1 md:grid-cols-2 lg:grid-cols-3&apos;,
        text: &apos;text-base&apos;,
        spacing: 'space-y-6&apos;,
        sidebarVisible: true,
        mobileOptimizations: &apos;',
        tabletOptimizations: &apos;',
        desktopOptimizations: &apos;hover:shadow-lg&apos;
      },
      updateScreenInfo: () => {}
    };
  }

  // Try to get isRTL from TranslationContext
  let isRTL = context.isRTL;
  try {
    // Import useTranslation at module level to avoid SSR issues
    const { useTranslation } = require(&apos;@/src/contexts/TranslationContext&apos;);
    const translationContext = useTranslation();
    isRTL = translationContext.isRTL;
  } catch {
    // Fallback if translation context is not available
    isRTL = false;
  }

  return {
    ...context,
    isRTL
  };
}

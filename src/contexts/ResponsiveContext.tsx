'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useScreenSize, ScreenInfo, getResponsiveClasses } from '@/src/hooks/useScreenSize';

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
    throw new Error('useResponsiveContext must be used within a ResponsiveProvider');
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
        size: 'desktop' as const,
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
        container: 'max-w-6xl mx-auto px-8',
        grid: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        text: 'text-base',
        spacing: 'space-y-6',
        sidebarVisible: true,
        mobileOptimizations: '',
        tabletOptimizations: '',
        desktopOptimizations: 'hover:shadow-lg'
      },
      updateScreenInfo: () => {}
    };
  }

  // Try to get isRTL from TranslationContext
  let isRTL = false;
  try {
    // Import useTranslation at module level to avoid SSR issues
    const { useTranslation } = require('@/src/contexts/TranslationContext');
    const translationContext = useTranslation();
    isRTL = translationContext.isRTL || false;
  } catch {
    // Fallback if translation context is not available
    isRTL = false;
  }

  return {
    ...context,
    isRTL,
    screenInfo: context.screenInfo,
    responsiveClasses: context.responsiveClasses
  };
}

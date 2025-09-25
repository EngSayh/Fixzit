'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useTranslation } from '@/src/contexts/TranslationContext';
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
  const { isRTL } = useTranslation();

  const responsiveClasses = getResponsiveClasses(screenInfo);

  const value = {
    screenInfo,
    isReady,
    responsiveClasses,
    isRTL,
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

  return context;
}

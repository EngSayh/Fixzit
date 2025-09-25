'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useScreenSize, ScreenInfo, getResponsiveClasses } from '@/src/hooks/useScreenSize';
import { useTranslation } from '@/src/contexts/TranslationContext';

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
  const translation = useTranslation();
  const isRTL = typeof translation?.isRTL === 'boolean' ? translation.isRTL : false;

  const responsiveClasses = getResponsiveClasses(screenInfo);

  const value: ResponsiveContextType = {
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
export function useResponsiveLayout() {
  const context = useContext(ResponsiveContext);
  const translation = useTranslation();
  const isRTL = typeof translation?.isRTL === 'boolean' ? translation.isRTL : false;

  if (!context) {
    const fallbackScreenInfo: ScreenInfo = {
      width: 1024,
      height: 768,
      size: 'desktop',
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
    };

    return {
      screenInfo: fallbackScreenInfo,
      isReady: false,
      responsiveClasses: getResponsiveClasses(fallbackScreenInfo),
      isRTL,
      updateScreenInfo: () => {},
    };
  }

  return {
    ...context,
    isRTL
  };
}

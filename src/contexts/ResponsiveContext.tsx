'use client';
import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useTranslation } from '@/src/contexts/TranslationContext';
import { getResponsiveClasses, ScreenInfo, useScreenSize } from '@/src/hooks/useScreenSize';

interface ResponsiveContextType {
  screenInfo: ScreenInfo;
  isReady: boolean;
  responsiveClasses: ReturnType<typeof getResponsiveClasses>;
  isRTL: boolean;
  updateScreenInfo: () => void;
}

const ResponsiveContext = createContext<ResponsiveContextType | undefined>(undefined);

const FALLBACK_SCREEN_INFO: ScreenInfo = {
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

const noop = () => {};

export function ResponsiveProvider({ children }: { children: ReactNode }) {
  const { screenInfo, isReady, updateScreenInfo } = useScreenSize();
  const { isRTL } = useTranslation();

  const responsiveClasses = useMemo(() => getResponsiveClasses(screenInfo), [screenInfo]);
  const value = useMemo<ResponsiveContextType>(
    () => ({ screenInfo, isReady, responsiveClasses, isRTL, updateScreenInfo }),
    [screenInfo, isReady, responsiveClasses, isRTL, updateScreenInfo]
  );
  return <ResponsiveContext.Provider value={value}>{children}</ResponsiveContext.Provider>;
}

export function useResponsiveContext() {
  const context = useContext(ResponsiveContext);
  if (context === undefined) {
    throw new Error('useResponsiveContext must be used within a ResponsiveProvider');
  }
  return context;
}

function buildFallback(isRTL: boolean): ResponsiveContextType {
  return {
    screenInfo: FALLBACK_SCREEN_INFO,
    isReady: false,
    responsiveClasses: getResponsiveClasses(FALLBACK_SCREEN_INFO),
    isRTL,
    updateScreenInfo: noop
  };
}

// Convenience hook that combines both screen size and responsive context
export function useResponsiveLayout() {
  const context = useContext(ResponsiveContext);
  const { isRTL } = useTranslation();

  return useMemo(() => {
    if (!context) {
      return buildFallback(isRTL);
    }

    if (context.isRTL === isRTL) {
      return context;
    }

    return { ...context, isRTL };
  }, [context, isRTL]);
}

// Backwards-compatible alias for legacy imports
export function useResponsive() {
  return useResponsiveLayout();
}

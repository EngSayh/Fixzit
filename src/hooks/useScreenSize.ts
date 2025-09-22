'use client';

import { useState, useEffect, useCallback } from 'react';

export type ScreenSize = 'mobile' | 'tablet' | 'desktop' | 'large';

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
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  if (width < 1280) return 'desktop';
  return 'large';
};

const getScreenInfo = (): ScreenInfo => {
  const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const height = typeof window !== 'undefined' ? window.innerHeight : 768;
  const size = getScreenSize(width);
  const devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const isTouchDevice = typeof window !== 'undefined' ? 'ontouchstart' in window : false;

  return {
    width,
    height,
    size,
    isMobile: size === 'mobile',
    isTablet: size === 'tablet',
    isDesktop: size === 'desktop',
    isLarge: size === 'large',
    isSmall: width < 768,
    isPortrait: height > width,
    isLandscape: width >= height,
    devicePixelRatio,
    isTouchDevice,
    isHighResolution: devicePixelRatio > 1
  };
};

export function useScreenSize() {
  const [screenInfo, setScreenInfo] = useState<ScreenInfo>(() => getScreenInfo());
  const [isReady, setIsReady] = useState(false);

  const updateScreenInfo = useCallback(() => {
    const newScreenInfo = getScreenInfo();
    setScreenInfo(newScreenInfo);
  }, []);

  useEffect(() => {
    // Set initial screen info
    setScreenInfo(getScreenInfo());
    setIsReady(true);

    // Add event listeners for screen size changes
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateScreenInfo);
      window.addEventListener('orientationchange', updateScreenInfo);

      // Also listen for viewport changes (mobile browsers)
      window.addEventListener('load', updateScreenInfo);

      return () => {
        window.removeEventListener('resize', updateScreenInfo);
        window.removeEventListener('orientationchange', updateScreenInfo);
        window.removeEventListener('load', updateScreenInfo);
      };
    }
  }, [updateScreenInfo]);

  return { screenInfo, isReady, updateScreenInfo };
}

// Helper function to get responsive classes
export function getResponsiveClasses(screenInfo: ScreenInfo) {
  const { size, isMobile, isTablet, isDesktop, isLarge } = screenInfo;

  return {
    // Container classes
    container: {
      mobile: 'max-w-sm mx-auto px-4',
      tablet: 'max-w-2xl mx-auto px-6',
      desktop: 'max-w-6xl mx-auto px-8',
      large: 'max-w-7xl mx-auto px-8'
    }[size],

    // Grid classes
    grid: {
      mobile: 'grid-cols-1',
      tablet: 'grid-cols-1 md:grid-cols-2',
      desktop: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      large: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
    }[size],

    // Text sizes
    text: {
      mobile: 'text-sm',
      tablet: 'text-base',
      desktop: 'text-base',
      large: 'text-lg'
    }[size],

    // Spacing
    spacing: {
      mobile: 'space-y-2',
      tablet: 'space-y-4',
      desktop: 'space-y-6',
      large: 'space-y-8'
    }[size],

    // Sidebar visibility
    sidebarVisible: !isMobile && !isTablet,

    // Mobile-specific adjustments
    mobileOptimizations: isMobile ? 'touch-manipulation' : '',
    tabletOptimizations: isTablet ? 'scroll-smooth' : '',
    desktopOptimizations: isDesktop ? 'hover:shadow-lg' : ''
  };
}

// Utility function for conditional rendering based on screen size
export function useResponsive() {
  const { screenInfo } = useScreenSize();

  return {
    isMobile: screenInfo.isMobile,
    isTablet: screenInfo.isTablet,
    isDesktop: screenInfo.isDesktop,
    isLarge: screenInfo.isLarge,
    isSmallScreen: screenInfo.isSmall,
    isTouchDevice: screenInfo.isTouchDevice,
    showSidebar: !screenInfo.isMobile && !screenInfo.isTablet,
    responsiveClasses: getResponsiveClasses(screenInfo),
    screenInfo
  };
}

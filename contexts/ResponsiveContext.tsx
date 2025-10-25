'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';


interface ResponsiveContextType {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isRTL: boolean;
  screenWidth: number;
  breakpoint: 'mobile' | 'tablet' | 'desktop';
}

const ResponsiveContext = createContext<ResponsiveContextType | undefined>(undefined);

interface ResponsiveProviderProps {
  children: ReactNode;
}

export function ResponsiveProvider({ children }: ResponsiveProviderProps) {
  // SSR-safe initialization: use 1024 (desktop) as default to avoid hydration mismatch
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {

    // SSR guard: only run on client
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    // Initialize screen width
    const updateScreenWidth = () => {
      setScreenWidth(window.innerWidth);
    };

    // Check RTL direction
    const checkRTL = () => {
      setIsRTL(document.dir === 'rtl' || document.documentElement.dir === 'rtl');
    };

    updateScreenWidth();
    checkRTL();

    window.addEventListener('resize', updateScreenWidth);
    
    // Observer for direction changes
    const observer = new MutationObserver(checkRTL);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['dir']
    });

    return () => {
      window.removeEventListener('resize', updateScreenWidth);
      observer.disconnect();
    };
  }, []);

  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;
  const isDesktop = screenWidth >= 1024;
  
  const breakpoint: 'mobile' | 'tablet' | 'desktop' = 
    isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';

  const value: ResponsiveContextType = {
    isMobile,
    isTablet,
    isDesktop,
    isRTL,
    screenWidth,
    breakpoint,
  };

  return (
    <ResponsiveContext.Provider value={value}>
      {children}
    </ResponsiveContext.Provider>
  );
}

export function useResponsiveLayout(): ResponsiveContextType {
  const context = useContext(ResponsiveContext);
  if (context === undefined) {
    throw new Error('useResponsive must be used within a ResponsiveProvider');
  }
  return context;
}

export { ResponsiveContext };


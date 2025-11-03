'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { APPS, AppKey, detectAppFromPath } from '@/config/topbar-modules';

interface TopBarState {
  app: AppKey;
  searchPlaceholderKey: string; // FIX: Changed to match AppConfig
  searchEntities: string[];
  quickActions: Array<{
    id: string;
    labelKey: string; // FIX: Changed to match AppConfig
    href: string;
    permission: string;
  }>;
  // eslint-disable-next-line no-unused-vars
  setApp: (app: AppKey) => void;
}

const TopBarContext = createContext<TopBarState | null>(null);

export function TopBarProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  // URL is SINGLE SOURCE OF TRUTH - no localStorage race condition
  const app = detectAppFromPath(pathname || '/');
  const appConfig = APPS[app];

  // setApp must trigger navigation, not just state change
  const setApp = (newApp: AppKey) => {
    const routePrefix = APPS[newApp].routePrefix;
    router.push(routePrefix);
  };

  const value = useMemo<TopBarState>(() => ({
    app,
    searchPlaceholderKey: appConfig.searchPlaceholderKey, // FIX: Use new property name
    searchEntities: appConfig.searchEntities,
    quickActions: appConfig.quickActions,
    setApp,

  }), [app]); // Only depend on app, not appConfig (derived from app)

  return (
    <TopBarContext.Provider value={value}>
      {children}
    </TopBarContext.Provider>
  );
}

export function useTopBar() {
  const context = useContext(TopBarContext);
  if (!context) {
    throw new Error('useTopBar must be used within TopBarProvider');
  }
  return context;
}
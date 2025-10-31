'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { APPS, AppKey, detectAppFromPath } from '@/config/topbar-modules';

interface TopBarState {
  app: AppKey;
  searchPlaceholder: string;
  searchEntities: string[];
  quickActions: Array<{
    id: string;
    label: string;
    href: string;
    permission: string;
  }>;
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
    searchPlaceholder: appConfig.searchPlaceholder,
    searchEntities: appConfig.searchEntities,
    quickActions: appConfig.quickActions,
    setApp,
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
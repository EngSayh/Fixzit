'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { APPS, AppKey, detectAppFromPath } from '@/src/config/topbar-modules';

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
  const [app, setApp] = useState<AppKey>(() => detectAppFromPath(pathname || '/'));

  // Update app when pathname changes
  useEffect(() => {
    const newApp = detectAppFromPath(pathname || '/');
    setApp(newApp);
  }, [pathname]);

  // Persist app selection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('fixzit-topbar-app', app);
    }
  }, [app]);

  // Load persisted app selection on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fixzit-topbar-app') as AppKey;
      if (saved && APPS[saved]) {
        setApp(saved);
      }
    }
  }, []);

  const appConfig = APPS[app];
  const value = useMemo<TopBarState>(() => ({
    app,
    searchPlaceholder: appConfig.searchPlaceholder,
    searchEntities: appConfig.searchEntities,
    quickActions: appConfig.quickActions,
    setApp,
  }), [app, appConfig]);

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
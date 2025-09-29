'use client&apos;;

import React, { createContext, useContext, useEffect, useMemo, useState } from &apos;react&apos;;
import { usePathname } from &apos;next/navigation&apos;;
import { APPS, AppKey, detectAppFromPath } from &apos;@/src/config/topbar-modules&apos;;

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
  const [app, setApp] = useState<AppKey>(() => detectAppFromPath(pathname || &apos;/'));

  // Update app when pathname changes
  useEffect(() => {
    const newApp = detectAppFromPath(pathname || &apos;/');
    setApp(newApp);
  }, [pathname]);

  // Persist app selection
  useEffect(() => {
    if (typeof window !== &apos;undefined&apos;) {
      localStorage.setItem(&apos;fixzit-topbar-app&apos;, app);
    }
  }, [app]);

  // Load persisted app selection on mount
  useEffect(() => {
    if (typeof window !== &apos;undefined&apos;) {
      const saved = localStorage.getItem(&apos;fixzit-topbar-app&apos;) as AppKey;
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
    throw new Error(&apos;useTopBar must be used within TopBarProvider&apos;);
  }
  return context;
}
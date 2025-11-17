'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  APPS,
  AppKey,
  ModuleScope,
  QuickActionConfig,
  SavedSearchConfig,
  SearchEntity,
  detectAppFromPath,
  detectModuleFromPath,
  getModuleQuickActions,
  getModuleSavedSearches,
  getModuleSearchConfig,
  getNavKeyForScope,
  getSearchEntitiesForScope,
} from '@/config/topbar-modules';
import type { SidebarModuleKey } from '@/config/topbar-modules';

interface TopBarState {
  app: AppKey;
  appLabelKey: string;
  appFallbackLabel: string;
  appSearchEntities: SearchEntity[];
  module: ModuleScope;
  moduleLabelKey: string;
  moduleFallbackLabel: string;
  searchPlaceholderKey: string;
  searchPlaceholderFallback: string;
  searchEntities: SearchEntity[];
  quickActions: QuickActionConfig[];
  savedSearches: SavedSearchConfig[];
  navKey?: SidebarModuleKey;
  megaMenuCollapsed: boolean;
  setMegaMenuCollapsed: (_next: boolean) => void;
  setApp: (_app: AppKey) => void;
}

const TopBarContext = createContext<TopBarState | null>(null);
const MEGA_MENU_PREF_KEY = 'fixzit:topbar:megaMenuCollapsed';
const APP_FALLBACK_LABELS: Record<AppKey, string> = {
  fm: 'Facility Management (FM)',
  souq: 'Materials Marketplace (Fixizit Souq)',
  aqar: 'Real Estate Marketplace (Aqar Souq)',
};

export function TopBarProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const app = detectAppFromPath(pathname || '/');
  const module = detectModuleFromPath(pathname || '/');
  const appConfig = APPS[app];
  const moduleConfig = getModuleSearchConfig(module);
  const searchEntities = getSearchEntitiesForScope(module, app);
  const quickActions = getModuleQuickActions(module, app);
  const savedSearches = getModuleSavedSearches(module);
  const navKey = getNavKeyForScope(module);

  const [megaMenuCollapsed, setMegaMenuCollapsedState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(MEGA_MENU_PREF_KEY) === '1';
  });

  const setMegaMenuCollapsed = useCallback((next: boolean) => {
    setMegaMenuCollapsedState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MEGA_MENU_PREF_KEY, next ? '1' : '0');
    }
  }, []);

  // setApp must trigger navigation, not just state change
  const setApp = (newApp: AppKey) => {
    const routePrefix = APPS[newApp].routePrefix;
    router.push(routePrefix);
  };

  const value = useMemo<TopBarState>(() => ({
    app,
    appLabelKey: appConfig.labelKey,
    appFallbackLabel: APP_FALLBACK_LABELS[app],
    appSearchEntities: appConfig.searchEntities,
    module,
    moduleLabelKey: moduleConfig.labelKey,
    moduleFallbackLabel: moduleConfig.fallbackLabel,
    searchPlaceholderKey: moduleConfig.searchPlaceholderKey,
    searchPlaceholderFallback: moduleConfig.placeholderFallback,
    searchEntities,
    quickActions,
    savedSearches,
    navKey,
    megaMenuCollapsed,
    setMegaMenuCollapsed,
    setApp,
  }), [app, appConfig, module, moduleConfig, searchEntities, quickActions, savedSearches, navKey, megaMenuCollapsed, setMegaMenuCollapsed]);

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

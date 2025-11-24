"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
} from "@/config/topbar-modules";
import type { SidebarModuleKey } from "@/config/topbar-modules";

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
export { TopBarContext };
const MEGA_MENU_PREF_KEY = "fixzit:topbar:megaMenuCollapsed";
const APP_FALLBACK_LABELS: Record<AppKey, string> = {
  fm: "Facility Management (FM)",
  souq: "Materials Marketplace (Fixizit Souq)",
  aqar: "Real Estate Marketplace (Aqar Souq)",
};

export function TopBarProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const sessionUser = session?.user as
    | { id?: string; orgId?: string }
    | undefined;
  const userId = sessionUser?.id ?? "anonymous";
  const orgId = sessionUser?.orgId ?? "global";
  const megaMenuPrefKey = useMemo(
    () => `${MEGA_MENU_PREF_KEY}:${orgId}:${userId}`,
    [orgId, userId],
  );

  const app = detectAppFromPath(pathname || "/");
  const moduleScope = detectModuleFromPath(pathname || "/");
  const appConfig = APPS[app];
  const moduleConfig = getModuleSearchConfig(moduleScope);
  const searchEntities = getSearchEntitiesForScope(moduleScope, app);
  const quickActions = getModuleQuickActions(moduleScope, app);
  const savedSearches = getModuleSavedSearches(moduleScope);
  const navKey = getNavKeyForScope(moduleScope);

  const [megaMenuCollapsed, setMegaMenuCollapsedState] = useState<boolean>(
    () => {
      if (typeof window === "undefined") return false;
      return window.localStorage.getItem(megaMenuPrefKey) === "1";
    },
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(megaMenuPrefKey);
    setMegaMenuCollapsedState(stored === "1");
  }, [megaMenuPrefKey]);

  const setMegaMenuCollapsed = useCallback(
    (next: boolean) => {
      setMegaMenuCollapsedState(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(megaMenuPrefKey, next ? "1" : "0");
      }
    },
    [megaMenuPrefKey],
  );

  // setApp must trigger navigation, not just state change
  const setApp = (newApp: AppKey) => {
    const routePrefix = APPS[newApp].routePrefix;
    router.push(routePrefix);
  };

  const value = useMemo<TopBarState>(
    () => ({
      app,
      appLabelKey: appConfig.labelKey,
      appFallbackLabel: APP_FALLBACK_LABELS[app],
      appSearchEntities: appConfig.searchEntities,
      module: moduleScope,
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
    }),
    [
      app,
      appConfig,
      moduleScope,
      moduleConfig,
      searchEntities,
      quickActions,
      savedSearches,
      navKey,
      megaMenuCollapsed,
      setMegaMenuCollapsed,
    ],
  );

  return (
    <TopBarContext.Provider value={value}>{children}</TopBarContext.Provider>
  );
}

export function useTopBar() {
  const context = useContext(TopBarContext);
  if (!context) {
    throw new Error("useTopBar must be used within TopBarProvider");
  }
  return context;
}

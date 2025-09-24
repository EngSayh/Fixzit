'use client';

import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import { usePathname } from 'next/navigation';
import { APPS, AppKey, SearchEntity } from '@/src/config/module-registry';

type TopBarState = {
  app: AppKey;
  placeholder: string;
  searchEntities: SearchEntity[];
  setApp: (k: AppKey) => void;
  quickActions: { id: string; label: string; href: string }[];
  language: 'en' | 'ar';
  setLanguage: (l: 'en' | 'ar') => void;
  isRTL: boolean;
  topMenuCollapsed: boolean;
  setTopMenuCollapsed: (c: boolean) => void;
};

const TopBarCtx = createContext<TopBarState | null>(null);

const detectAppFromPath = (pathname: string): AppKey => {
  if (pathname.startsWith('/aqar')) return 'aqar';
  if (pathname.startsWith('/marketplace') || pathname.startsWith('/souq')) return 'souq';
  return 'fm';
};

const storageKey = (tenantId: string, userId: string) => `fixzit:topbar:${tenantId}:${userId}`;

export const TopBarProvider: React.FC<{ children: React.ReactNode; tenantId: string; userId: string }> = ({ children, tenantId, userId }) => {
  const pathname = usePathname();
  const [app, setApp] = useState<AppKey>(detectAppFromPath(pathname ?? '/'));
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const [topMenuCollapsed, setTopMenuCollapsed] = useState(true);

  // Mock role for now - replace with real auth
  const role: RoleKey = 'admin';

  useEffect(() => {
    const k = storageKey(tenantId, userId);
    const saved = globalThis?.localStorage?.getItem(k);
    if (saved) {
      try { 
        const data = JSON.parse(saved);
        setApp(data.app as AppKey);
        setLanguage(data.language || 'en');
        setTopMenuCollapsed(data.topMenuCollapsed !== false);
      } catch {}
    } else {
      setApp(detectAppFromPath(pathname ?? '/'));
    }
  }, [pathname, tenantId, userId]);

  useEffect(() => {
    const k = storageKey(tenantId, userId);
    globalThis?.localStorage?.setItem(k, JSON.stringify({ 
      app, 
      language, 
      topMenuCollapsed 
    }));
  }, [app, language, topMenuCollapsed, tenantId, userId]);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const cfg = APPS[app];

  const quickActions = useMemo(() => {
    return cfg.quickActions(role)
      .filter(a => hasPermission(role, a.perm))
      .map(({perm, ...rest}) => rest);
  }, [cfg, role]);

  const value = useMemo<TopBarState>(() => ({
    app,
    placeholder: cfg.defaultPlaceholder,
    searchEntities: cfg.searchEntities,
    setApp,
    quickActions,
    language,
    setLanguage,
    isRTL: language === 'ar',
    topMenuCollapsed,
    setTopMenuCollapsed,
  }), [app, cfg, quickActions, language, topMenuCollapsed]);

  return <TopBarCtx.Provider value={value}>{children}</TopBarCtx.Provider>;
};

export const useTopBar = () => {
  const ctx = useContext(TopBarCtx);
  if (!ctx) throw new Error('useTopBar must be used within TopBarProvider');
  return ctx;
};

// Simple permission check - replace with real RBAC
function hasPermission(role: RoleKey, perm: string): boolean {
  const permissions: Record<RoleKey, string[]> = {
    super_admin: ['*'],
    admin: ['wo.create','inspections.create','finance.invoice.create','souq.rfq.create','souq.po.create','souq.item.create','aqar.listing.create','aqar.valuation.create'],
    corporate_owner: ['wo.create','finance.invoice.create','souq.rfq.create','aqar.listing.create'],
    team_member: ['wo.create','souq.rfq.create'],
    technician: [],
    property_manager: ['wo.create'],
    tenant: ['souq.rfq.create','aqar.valuation.create'],
    vendor: ['souq.item.create'],
    guest: [],
  };
  
  const perms = permissions[role] || [];
  return perms.includes('*') || perms.includes(perm);
}
'use client';

/**
 * AppContext Provider
 * Manages app-level state: user, tenant, preferences
 */

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import type { UserContext, TenantContext, TopBarPrefs, LangCode, Dir } from '@/types/topbar';
import { toDir } from '@/utils/i18n';

interface AppContextValue {
  user: UserContext | null;
  tenant: TenantContext | null;
  prefs: TopBarPrefs;
  setUser: (user: UserContext | null) => void;
  setTenant: (tenant: TenantContext | null) => void;
  updatePrefs: (updates: Partial<TopBarPrefs>) => void;
  switchLanguage: (lang: LangCode) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserContext | null>(null);
  const [tenant, setTenant] = useState<TenantContext | null>(null);
  const [prefs, setPrefs] = useState<TopBarPrefs>({
    lang: 'en',
    dir: 'ltr',
    currency: 'SAR',
    megaMenuExpanded: false,
  });

  const updatePrefs = useCallback((updates: Partial<TopBarPrefs>) => {
    setPrefs(prev => ({ ...prev, ...updates }));
  }, []);

  const switchLanguage = useCallback((lang: LangCode) => {
    const dir = toDir(lang);
    setPrefs(prev => ({ ...prev, lang, dir }));
    
    // Update document direction
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lang);
  }, []);

  // Initialize from localStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('lang') as LangCode | null;
    if (savedLang && (savedLang === 'ar' || savedLang === 'en')) {
      switchLanguage(savedLang);
    }
  }, [switchLanguage]);

  // Persist language preference
  useEffect(() => {
    localStorage.setItem('lang', prefs.lang);
  }, [prefs.lang]);

  return (
    <AppContext.Provider
      value={{
        user,
        tenant,
        prefs,
        setUser,
        setTenant,
        updatePrefs,
        switchLanguage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

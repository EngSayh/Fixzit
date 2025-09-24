// src/contexts/AppScopeContext.tsx
'use client';
import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { MODULES } from '@/src/config/dynamic-modules';
import { routeToModule } from '@/src/utils/routeToScope';

type Lang = 'en' | 'ar';
type ScopeMode = 'module' | 'all';

interface AppScope {
  moduleId: string;
  moduleLabel: string;
  language: Lang;
  dir: 'ltr' | 'rtl';
  scopeMode: ScopeMode;
  setLanguage: (l: Lang) => void;
  setScopeMode: (m: ScopeMode) => void;
}

const Ctx = createContext<AppScope | null>(null);

export function AppScopeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const moduleId = routeToModule(pathname || '/');
  const moduleConfig = MODULES.find(m => m.id === moduleId);
  
  const [language, setLanguageState] = useState<Lang>(() => (typeof window !== 'undefined' ? (localStorage.getItem('lang') as Lang) : 'en') || 'en');
  const [scopeMode, setScopeModeState] = useState<ScopeMode>(() => (typeof window !== 'undefined' ? (localStorage.getItem('scopeMode') as ScopeMode) : 'module') || 'module');

  useEffect(() => { localStorage.setItem('lang', language); document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'; }, [language]);
  useEffect(() => { localStorage.setItem('scopeMode', scopeMode); }, [scopeMode]);

  const moduleLabel = language === 'ar' ? (moduleConfig?.labelAr || moduleConfig?.label || 'الرئيسية') : (moduleConfig?.label || 'Home');

  const value = useMemo<AppScope>(() => ({
    moduleId, 
    moduleLabel,
    language,
    dir: language === 'ar' ? 'rtl' : 'ltr',
    scopeMode,
    setLanguage: (l) => setLanguageState(l),
    setScopeMode: (m) => setScopeModeState(m),
  }), [moduleId, moduleLabel, language, scopeMode]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAppScope = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppScope must be used within AppScopeProvider');
  return ctx;
};

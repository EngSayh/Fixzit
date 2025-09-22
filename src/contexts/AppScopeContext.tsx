// src/contexts/AppScopeContext.tsx
'use client';
import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

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
  const moduleId = getCurrentModule(pathname || '/');
  const moduleLabel = getModuleLabel(moduleId);

  const [language, setLanguageState] = useState<Lang>(() => (typeof window !== 'undefined' ? (localStorage.getItem('lang') as Lang) : 'en') || 'en');
  const [scopeMode, setScopeModeState] = useState<ScopeMode>(() => (typeof window !== 'undefined' ? (localStorage.getItem('scopeMode') as ScopeMode) : 'module') || 'module');

  useEffect(() => { localStorage.setItem('lang', language); document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'; }, [language]);
  useEffect(() => { localStorage.setItem('scopeMode', scopeMode); }, [scopeMode]);

  const value = useMemo<AppScope>(() => ({
    moduleId, moduleLabel,
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

function getCurrentModule(pathname: string): string {
  if (pathname.startsWith('/fm') || pathname.startsWith('/work-orders')) return 'work-orders';
  if (pathname.startsWith('/properties')) return 'properties';
  if (pathname.startsWith('/finance')) return 'finance';
  if (pathname.startsWith('/hr')) return 'hr';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/crm')) return 'crm';
  if (pathname.startsWith('/aqar') || pathname.startsWith('/marketplace/real-estate')) return 'aqar_souq';
  if (pathname.startsWith('/souq') || pathname.startsWith('/marketplace/materials')) return 'marketplace';
  if (pathname.startsWith('/support')) return 'support';
  return 'dashboard';
}

function getModuleLabel(moduleId: string): string {
  const labels: Record<string, string> = {
    'dashboard': 'Dashboard',
    'work_orders': 'Work Orders',
    'properties': 'Properties',
    'finance': 'Finance',
    'hr': 'Human Resources',
    'admin': 'Administration',
    'crm': 'CRM',
    'marketplace': 'Fixzit Souq',
    'aqar_souq': 'Aqar Souq',
    'support': 'Support'
  };
  return labels[moduleId] || 'Home';
}

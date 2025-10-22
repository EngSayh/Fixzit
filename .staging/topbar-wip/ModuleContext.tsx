'use client';

/**
 * ModuleContext Provider
 * Derives current module from URL pathname
 */

import { createContext, useContext, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { ModuleId } from '@/types/topbar';
import { detectModule } from '@/config/modules';

interface ModuleContextValue {
  currentModule: ModuleId;
  pathname: string;
}

const ModuleContext = createContext<ModuleContextValue | undefined>(undefined);

export function ModuleProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const currentModule = detectModule(pathname);

  return (
    <ModuleContext.Provider value={{ currentModule, pathname }}>
      {children}
    </ModuleContext.Provider>
  );
}

export function useModule() {
  const context = useContext(ModuleContext);
  if (!context) {
    throw new Error('useModule must be used within ModuleProvider');
  }
  return context;
}

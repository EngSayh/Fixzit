'use client';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'light' | 'dark' | 'auto';
type Ctx = { theme: Theme; setTheme: (t: Theme) => void; dir: 'ltr'|'rtl'; setDir:(d:'ltr'|'rtl')=>void };

const ThemeCtx = createContext<Ctx | null>(null);
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [dir, setDir] = useState<'ltr'|'rtl'>('ltr');

  // SSR-safe: mutate DOM only in effect
  useEffect(() => {
    const root = document.documentElement;
    root.dir = dir;
    root.dataset.theme = theme;
  }, [theme, dir]);

  const value = useMemo(() => ({ theme, setTheme, dir, setDir }), [theme, dir]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}
export const useThemeCtx = () => {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error('useThemeCtx must be used within ThemeProvider');
  return v;
};


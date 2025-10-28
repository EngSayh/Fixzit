'use client';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'light' | 'dark' | 'auto';
type Ctx = { theme: Theme; setTheme: (t: Theme) => void };

const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  // Load theme from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('fixzit-theme');
    if (saved === 'light' || saved === 'dark' || saved === 'auto') {
      setTheme(saved);
    }
  }, []);

  // Save theme to localStorage and update DOM
  useEffect(() => {
    const root = document.documentElement;
    localStorage.setItem('fixzit-theme', theme);
    
    if (theme === 'auto') {
      // Handle 'auto' theme by detecting system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.dataset.theme = prefersDark ? 'dark' : 'light';
      
      // Listen for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        root.dataset.theme = e.matches ? 'dark' : 'light';
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      root.dataset.theme = theme;
    }
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export const useThemeCtx = () => {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error('useThemeCtx must be used within ThemeProvider');
  return v;
};


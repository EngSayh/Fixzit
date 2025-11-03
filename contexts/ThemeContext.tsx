'use client';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'light' | 'dark' | 'auto';
type ResolvedTheme = 'light' | 'dark';
/* eslint-disable no-unused-vars */
type Ctx = { 
  theme: Theme; 
  resolvedTheme: ResolvedTheme | null;
  setTheme: (t: Theme) => void;
};
/* eslint-enable no-unused-vars */

const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start with null to prevent FOUC (Flash Of Unstyled Content)
  const [theme, setTheme] = useState<Theme | null>(null);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme | null>(null);

  // Load theme from localStorage on mount (client-side only)
  useEffect(() => {
    const saved = localStorage.getItem('fixzit-theme');
    setTheme((saved === 'light' || saved === 'dark' || saved === 'auto') ? saved : 'light');
  }, []);

  // Update DOM and manage system theme listener
  useEffect(() => {
    if (!theme) return; // Don't run until theme is loaded

    const root = document.documentElement;
    localStorage.setItem('fixzit-theme', theme);
    
    // Media query for system theme detection
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Function to resolve and apply theme
    const applyTheme = () => {
      let resolved: ResolvedTheme;
      if (theme === 'auto') {
        resolved = mediaQuery.matches ? 'dark' : 'light';
      } else {
        resolved = theme;
      }
      root.dataset.theme = resolved;
      setResolvedTheme(resolved);
    };

    // Apply theme immediately
    applyTheme();
    
    // Listen for system theme changes (only if theme is 'auto')
    if (theme === 'auto') {
      const handler = () => applyTheme();
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
    // Cleanup is ALWAYS called - fixes memory leak
    return undefined;
  }, [theme]);

  const value = useMemo(() => ({
    theme: theme ?? 'light', // Provide fallback for type safety
    resolvedTheme,
    // eslint-disable-next-line no-unused-vars
    setTheme: setTheme as (t: Theme) => void,
  }), [theme, resolvedTheme]);

  // Don't render children until theme is loaded (prevents FOUC)
  if (!theme) return null;

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export const useThemeCtx = () => {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error('useThemeCtx must be used within ThemeProvider');
  return v;
};


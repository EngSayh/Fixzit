"use client";

/**
 * Centralized Color Theme Provider (ColorThemeProvider)
 * 
 * This provider loads theme COLOR configuration from the API and applies it as CSS variables
 * across the entire application. SuperAdmin can control all colors.
 * 
 * NOTE: This is SEPARATE from ThemeContext which handles light/dark mode.
 * This provider handles the COLOR PALETTE (primary green, gold, etc.)
 * 
 * @module providers/ThemeProvider
 * @compliance Ejar.sa Design System (Saudi Platforms Code)
 * 
 * Usage:
 * - Wrap your app with <ColorThemeProvider>
 * - Use CSS variables like var(--theme-primary), var(--theme-secondary), etc.
 * - SuperAdmin changes are reflected immediately across all components
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";

/**
 * Theme configuration interface
 * Matches the PlatformSettings.theme schema
 */
export interface ThemeColors {
  // Primary Colors (Ejar Green)
  primary: string;
  primaryHover: string;
  primaryActive: string;
  primaryLight: string;
  
  // Secondary Colors (Gold accent)
  secondary: string;
  secondaryHover: string;
  
  // Semantic Colors
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  error: string;
  errorLight: string;
  info: string;
  infoLight: string;
  
  // Neutral Scale
  neutral50: string;
  neutral100: string;
  neutral200: string;
  neutral300: string;
  neutral400: string;
  neutral500: string;
  neutral600: string;
  neutral700: string;
  neutral800: string;
  neutral900: string;
  neutral950: string;
  
  // Special Colors
  sidebarBg: string;
  footerBg: string;
  headerBg: string;
  
  // Additional brand colors
  lavender: string;
  saudiGreen: string;
}

/**
 * Default theme based on Ejar.sa design system
 */
const DEFAULT_THEME: ThemeColors = {
  // Primary Colors (Ejar Green #25935F)
  primary: "#25935F",
  primaryHover: "#188352",
  primaryActive: "#166A45",
  primaryLight: "#E8F7EE",
  
  // Secondary Colors (Gold accent)
  secondary: "#F5BD02",
  secondaryHover: "#D4A302",
  
  // Semantic Colors
  success: "#17B26A",
  successLight: "#ECFDF5",
  warning: "#F79009",
  warningLight: "#FFFAEB",
  error: "#F04438",
  errorLight: "#FEF3F2",
  info: "#2E90FA",
  infoLight: "#EFF8FF",
  
  // Neutral Scale
  neutral50: "#F9FAFB",
  neutral100: "#F3F4F6",
  neutral200: "#E5E7EB",
  neutral300: "#CFD4DB",
  neutral400: "#A8AEB8",
  neutral500: "#8A919C",
  neutral600: "#6C737F",
  neutral700: "#434B5A",
  neutral800: "#2D3340",
  neutral900: "#1A1F2B",
  neutral950: "#0D121C",
  
  // Special Colors
  sidebarBg: "#0D121C",
  footerBg: "#0D121C",
  headerBg: "#25935F",
  
  // Additional brand colors
  lavender: "#80519F",
  saudiGreen: "#006C35",
};

interface ColorThemeContextValue {
  theme: ThemeColors;
  isLoading: boolean;
  isDefault: boolean;
  refreshTheme: () => Promise<void>;
  updateTheme: (newTheme: Partial<ThemeColors>) => Promise<boolean>;
  resetTheme: () => Promise<boolean>;
}

const ColorThemeContext = createContext<ColorThemeContextValue | undefined>(undefined);

/**
 * Apply theme colors as CSS custom properties
 */
function applyThemeToDOM(theme: ThemeColors): void {
  const root = document.documentElement;
  
  // Primary colors
  root.style.setProperty("--theme-primary", theme.primary);
  root.style.setProperty("--theme-primary-hover", theme.primaryHover);
  root.style.setProperty("--theme-primary-active", theme.primaryActive);
  root.style.setProperty("--theme-primary-light", theme.primaryLight);
  
  // Secondary colors
  root.style.setProperty("--theme-secondary", theme.secondary);
  root.style.setProperty("--theme-secondary-hover", theme.secondaryHover);
  
  // Semantic colors
  root.style.setProperty("--theme-success", theme.success);
  root.style.setProperty("--theme-success-light", theme.successLight);
  root.style.setProperty("--theme-warning", theme.warning);
  root.style.setProperty("--theme-warning-light", theme.warningLight);
  root.style.setProperty("--theme-error", theme.error);
  root.style.setProperty("--theme-error-light", theme.errorLight);
  root.style.setProperty("--theme-info", theme.info);
  root.style.setProperty("--theme-info-light", theme.infoLight);
  
  // Neutral scale
  root.style.setProperty("--theme-neutral-50", theme.neutral50);
  root.style.setProperty("--theme-neutral-100", theme.neutral100);
  root.style.setProperty("--theme-neutral-200", theme.neutral200);
  root.style.setProperty("--theme-neutral-300", theme.neutral300);
  root.style.setProperty("--theme-neutral-400", theme.neutral400);
  root.style.setProperty("--theme-neutral-500", theme.neutral500);
  root.style.setProperty("--theme-neutral-600", theme.neutral600);
  root.style.setProperty("--theme-neutral-700", theme.neutral700);
  root.style.setProperty("--theme-neutral-800", theme.neutral800);
  root.style.setProperty("--theme-neutral-900", theme.neutral900);
  root.style.setProperty("--theme-neutral-950", theme.neutral950);
  
  // Special colors
  root.style.setProperty("--theme-sidebar-bg", theme.sidebarBg);
  root.style.setProperty("--theme-footer-bg", theme.footerBg);
  root.style.setProperty("--theme-header-bg", theme.headerBg);
  
  // Additional brand colors
  root.style.setProperty("--theme-lavender", theme.lavender);
  root.style.setProperty("--theme-saudi-green", theme.saudiGreen);
  
  // Also update the legacy CSS variables for backward compatibility
  root.style.setProperty("--color-primary", theme.primary);
  root.style.setProperty("--color-primary-hover", theme.primaryHover);
  root.style.setProperty("--color-primary-active", theme.primaryActive);
  root.style.setProperty("--color-secondary", theme.secondary);
  root.style.setProperty("--color-success", theme.success);
  root.style.setProperty("--color-warning", theme.warning);
  root.style.setProperty("--color-error", theme.error);
  root.style.setProperty("--color-info", theme.info);
  
  // Ejar-prefixed variables for existing components
  root.style.setProperty("--ejar-primary-500", theme.primary);
  root.style.setProperty("--ejar-primary-600", theme.primaryHover);
  root.style.setProperty("--ejar-primary-700", theme.primaryActive);
  root.style.setProperty("--ejar-gold", theme.secondary);
  root.style.setProperty("--ejar-neutral-950", theme.neutral950);
}

interface ColorThemeProviderProps {
  children: ReactNode;
}

export function ColorThemeProvider({ children }: ColorThemeProviderProps): JSX.Element {
  const [theme, setTheme] = useState<ThemeColors>(DEFAULT_THEME);
  const [isLoading, setIsLoading] = useState(true);
  const [isDefault, setIsDefault] = useState(true);
  
  /**
   * Fetch theme from API
   */
  const refreshTheme = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch("/api/superadmin/theme", {
        cache: "no-store",
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.theme) {
          setTheme(data.theme);
          setIsDefault(data.isDefault ?? false);
          applyThemeToDOM(data.theme);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console -- Error boundary logging
      console.error("[ColorThemeProvider] Failed to fetch theme:", error);
      // Fall back to default theme
      applyThemeToDOM(DEFAULT_THEME);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  /**
   * Update theme via API (SuperAdmin only)
   */
  const updateTheme = useCallback(async (newTheme: Partial<ThemeColors>): Promise<boolean> => {
    try {
      const response = await fetch("/api/superadmin/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: newTheme }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.theme) {
          setTheme(data.theme);
          setIsDefault(false);
          applyThemeToDOM(data.theme);
          return true;
        }
      }
      return false;
    } catch (error) {
      // eslint-disable-next-line no-console -- Error boundary logging
      console.error("[ThemeProvider] Failed to update theme:", error);
      return false;
    }
  }, []);
  
  /**
   * Reset theme to defaults (SuperAdmin only)
   */
  const resetTheme = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/superadmin/theme", {
        method: "POST",
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.theme) {
          setTheme(data.theme);
          setIsDefault(true);
          applyThemeToDOM(data.theme);
          return true;
        }
      }
      return false;
    } catch (error) {
      // eslint-disable-next-line no-console -- Error boundary logging
      console.error("[ThemeProvider] Failed to reset theme:", error);
      return false;
    }
  }, []);
  
  // Load theme on mount
  useEffect(() => {
    refreshTheme();
  }, [refreshTheme]);
  
  // Apply default theme immediately to prevent flash
  useEffect(() => {
    applyThemeToDOM(DEFAULT_THEME);
  }, []);
  
  return (
    <ColorThemeContext.Provider
      value={{
        theme,
        isLoading,
        isDefault,
        refreshTheme,
        updateTheme,
        resetTheme,
      }}
    >
      {children}
    </ColorThemeContext.Provider>
  );
}

/**
 * Hook to access color theme context
 * NOTE: Use useColorTheme for color palette, useTheme (from ThemeContext) for light/dark mode
 */
export function useColorTheme(): ColorThemeContextValue {
  const context = useContext(ColorThemeContext);
  if (!context) {
    throw new Error("useColorTheme must be used within a ColorThemeProvider");
  }
  return context;
}

/**
 * Export default theme for SSR and static contexts
 */
export { DEFAULT_THEME };

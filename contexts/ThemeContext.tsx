'use client';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSession } from 'next-auth/react';
import { STORAGE_KEYS, APP_DEFAULTS } from '@/config/constants';
import { logger } from '@/lib/logger';

type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

type ThemeContextValue = {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (_mode: ThemeMode) => void;
};

const ThemeCtx = createContext<ThemeContextValue | null>(null);

const normalizeTheme = (value?: string | null): ThemeMode | null => {
  if (!value) return null;
  const normalized = value.toString().trim().toLowerCase();
  if (normalized === 'light') return 'light';
  if (normalized === 'dark') return 'dark';
  if (normalized === 'system' || normalized === 'auto') return 'system';
  return null;
};

const getStoredTheme = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return APP_DEFAULTS.theme;
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEYS.theme);
    return normalizeTheme(stored) ?? APP_DEFAULTS.theme;
  } catch (error) {
    logger.warn('Theme: Failed to read from localStorage', { error });
    return APP_DEFAULTS.theme;
  }
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(APP_DEFAULTS.theme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [hydrated, setHydrated] = useState(false);
  const mediaQueryRef = useRef<MediaQueryList | null>(null);
  const { data: session } = useSession();

  const ensureMediaQuery = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!mediaQueryRef.current) {
      mediaQueryRef.current = window.matchMedia('(prefers-color-scheme: dark)');
    }
    return mediaQueryRef.current;
  }, []);

  const applyTheme = useCallback(
    (mode: ThemeMode) => {
      if (typeof document === 'undefined') return;
      const media = ensureMediaQuery();
      const prefersDark = media?.matches ?? false;
      const effective = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;
      const root = document.documentElement;
      root.classList.toggle('dark', effective === 'dark');
      root.dataset.theme = effective;
      root.style.setProperty('color-scheme', effective === 'dark' ? 'dark' : 'light');
      setResolvedTheme(effective);
    },
    [ensureMediaQuery]
  );

  // Initial load from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = getStoredTheme();
    setThemeState(stored);
    setHydrated(true);
  }, []);

  // Sync DOM + listen to system preference when needed
  useEffect(() => {
    if (!hydrated) return;
    applyTheme(theme);

    const media = ensureMediaQuery();
    if (!media) return;

    if (theme !== 'system') {
      return undefined;
    }

    const handler = () => applyTheme('system');
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [theme, hydrated, applyTheme, ensureMediaQuery]);

  // Persist to localStorage whenever theme changes
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.theme, theme);
    } catch (error) {
      logger.warn('Theme: Failed to persist to localStorage', { error });
    }
  }, [theme, hydrated]);

  // Load persisted preference from Mongo via API (optional)
  useEffect(() => {
    let cancelled = false;
    if (!session?.user?.id) {
      return () => {
        cancelled = true;
      };
    }

    const loadFromDb = async () => {
      try {
        const response = await fetch('/api/user/preferences', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        const remoteTheme = normalizeTheme(data?.preferences?.theme);
        if (remoteTheme && !cancelled) {
          setThemeState(remoteTheme);
        }
      } catch (error) {
        logger.warn('Theme: Failed to load remote preference', { error });
      }
    };

    loadFromDb().catch(err => logger.warn('Theme: Remote load error', { error: err }));

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const persistRemote = useCallback(
    async (mode: ThemeMode) => {
      if (!session?.user?.id) return;
      try {
        await fetch('/api/user/preferences', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ theme: mode }),
        });
      } catch (error) {
        logger.warn('Theme: Failed to persist remote preference', { error });
      }
    },
    [session?.user?.id]
  );

  const setTheme = useCallback(
    (mode: ThemeMode) => {
      setThemeState(mode);
      applyTheme(mode);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(STORAGE_KEYS.theme, mode);
        } catch (error) {
          logger.warn('Theme: Failed to persist to localStorage', { error });
        }
      }
      void persistRemote(mode);
    },
    [applyTheme, persistRemote]
  );

  const value = useMemo(() => ({
    theme,
    resolvedTheme,
    setTheme,
  }), [theme, resolvedTheme, setTheme]);

  if (!hydrated) {
    return null;
  }

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export const useThemeCtx = () => {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useThemeCtx must be used within ThemeProvider');
  return ctx;
};

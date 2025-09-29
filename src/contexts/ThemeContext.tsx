'use client&apos;;
import { createContext, useContext, useEffect, useMemo, useState } from &apos;react&apos;;

type Theme = &apos;light&apos; | &apos;dark&apos; | &apos;auto&apos;;
type Ctx = { theme: Theme; setTheme: (t: Theme) => void; dir: &apos;ltr&apos;|'rtl&apos;; setDir:(d:&apos;ltr&apos;|'rtl&apos;)=>void };

const ThemeCtx = createContext<Ctx | null>(null);
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(&apos;light&apos;);
  const [dir, setDir] = useState<&apos;ltr&apos;|'rtl&apos;>(&apos;ltr&apos;);

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
  if (!v) throw new Error(&apos;useThemeCtx must be used within ThemeProvider&apos;);
  return v;
};


"use client";

import React, { useMemo } from "react";
import { Monitor, Moon, SunMedium } from "lucide-react";
import { cn } from "@/lib/utils";
import { useThemeCtx } from "@/contexts/ThemeContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { SimpleTooltip } from "@/components/ui/tooltip";

type ThemeOption = {
  id: "light" | "dark" | "system";
  label: string;
  icon: React.ReactNode;
};

interface ThemeToggleProps {
  className?: string;
}

/**
 * Compact 3-state theme toggle with icon buttons.
 *
 * - Options: system, light, dark
 * - Uses ThemeContext for persistence (localStorage + API)
 * - Tooltip labels come from translations for a11y
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useThemeCtx();
  const { t } = useTranslation();

  const options = useMemo<ThemeOption[]>(
    () => [
      {
        id: "system",
        label: t("footer.theme.system", "System"),
        icon: <Monitor className="h-4 w-4" />,
      },
      {
        id: "light",
        label: t("footer.theme.light", "Light"),
        icon: <SunMedium className="h-4 w-4" />,
      },
      {
        id: "dark",
        label: t("footer.theme.dark", "Dark"),
        icon: <Moon className="h-4 w-4" />,
      },
    ],
    [t],
  );

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-background/80 px-1.5 py-1 shadow-sm backdrop-blur",
        className,
      )}
      role="group"
      aria-label={t("footer.themeToggleLabel", "Theme")}
    >
      {options.map((option) => {
        const isActive = theme === option.id;
        const isResolved =
          option.id === "system"
            ? theme === "system"
            : resolvedTheme === option.id;

        return (
          <SimpleTooltip key={option.id} content={option.label}>
            <button
              type="button"
              className={cn(
                "relative inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
              aria-pressed={isActive}
              aria-label={option.label}
              data-state={isActive ? "active" : "inactive"}
              onClick={() => setTheme(option.id)}
            >
              {option.icon}
              {isResolved ? (
                <span className="absolute -bottom-0.5 block h-1 w-8 rounded-full bg-primary/70" />
              ) : null}
            </button>
          </SimpleTooltip>
        );
      })}
    </div>
  );
}

export default ThemeToggle;

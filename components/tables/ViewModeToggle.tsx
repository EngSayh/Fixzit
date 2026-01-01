/**
 * ViewModeToggle - Switch between Table and Card views
 * P2 Mobile Strategy
 * 
 * ✅ Table icon (desktop default)
 * ✅ Card icon (mobile default)
 * ✅ Persists preference to localStorage
 * ✅ Responsive default (auto-switches based on viewport)
 */
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { LayoutGrid, LayoutList } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export type ViewMode = "table" | "cards";

export type ViewModeToggleProps = {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
};

export function ViewModeToggle({
  value,
  onChange,
  disabled = false,
  className,
  size = "md",
}: ViewModeToggleProps) {
  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const buttonSizes = {
    sm: "h-8",
    md: "h-9",
    lg: "h-11",
  };

  return (
    <div className={cn("inline-flex items-center rounded-md border bg-muted p-1", className)}>
      <Button
        variant={value === "table" ? "secondary" : "ghost"}
        size="icon"
        onClick={() => onChange("table")}
        disabled={disabled}
        aria-label="Switch to table view"
        aria-pressed={value === "table"}
        className={cn(
          buttonSizes[size],
          "shrink-0",
          value === "table" && "shadow-sm"
        )}
        title="Table view"
      >
        <LayoutList className={iconSizes[size]} />
      </Button>
      <Button
        variant={value === "cards" ? "secondary" : "ghost"}
        size="icon"
        onClick={() => onChange("cards")}
        disabled={disabled}
        aria-label="Switch to card view"
        aria-pressed={value === "cards"}
        className={cn(
          buttonSizes[size],
          "shrink-0",
          value === "cards" && "shadow-sm"
        )}
        title="Card view"
      >
        <LayoutGrid className={iconSizes[size]} />
      </Button>
    </div>
  );
}

/**
 * Hook: useViewMode
 * Manages view mode state with localStorage persistence and responsive defaults
 */
export function useViewMode(
  moduleKey: string,
  defaultMode?: ViewMode
): [ViewMode, (mode: ViewMode) => void] {
  const [viewMode, setViewMode] = React.useState<ViewMode>(() => {
    // SSR-safe: Check if window exists
    if (typeof window === "undefined") {
      return defaultMode || "table";
    }

    // Try localStorage first
    const stored = localStorage.getItem(`view-mode:${moduleKey}`);
    if (stored === "table" || stored === "cards") {
      return stored;
    }

    // If no stored preference, use responsive default
    if (defaultMode) {
      return defaultMode;
    }

    // Default: cards on mobile (<640px), table on desktop
    return window.innerWidth < 640 ? "cards" : "table";
  });

  const handleChange = React.useCallback(
    (mode: ViewMode) => {
      setViewMode(mode);
      if (typeof window !== "undefined") {
        localStorage.setItem(`view-mode:${moduleKey}`, mode);
      }
    },
    [moduleKey]
  );

  return [viewMode, handleChange];
}

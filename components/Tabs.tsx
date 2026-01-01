// components/Tabs.tsx
"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Accessible Tabs Component
 *
 * Features:
 * - Keyboard navigation (Cmd/Ctrl + 1-9 for quick tab switching)
 * - ARIA roles and states
 * - Focus management
 * - RTL-aware styling
 * - Theme-consistent colors
 */

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
  badge?: number;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (_tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, defaultTab, onChange, className }: TabsProps) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.id);
  const tabRefs = useRef<HTMLButtonElement[]>([]);

  // Keyboard shortcuts (Cmd/Ctrl + 1-9)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const num = parseInt(e.key, 10);
        if (num > 0 && num <= tabs.length) {
          const targetTab = tabs[num - 1];
          if (targetTab && !targetTab.disabled) {
            e.preventDefault();
            setActive(targetTab.id);
            tabRefs.current[num - 1]?.focus();
            onChange?.(targetTab.id);
          }
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [tabs, onChange]);

  const currentTab = tabs.find((t) => t.id === active);

  const handleTabClick = (tab: Tab, index: number) => {
    if (tab.disabled) return;
    setActive(tab.id);
    onChange?.(tab.id);
    tabRefs.current[index]?.focus();
  };

  return (
    <div className={cn("tabs-container", className)} aria-label="Tabs">
      {/* Tab List */}
      <div
        className="flex gap-2 border-b border-border bg-card/50"
        role="tablist"
      >
        {tabs.map((tab, i) => {
          const isActive = active === tab.id;
          return (
            <button type="button"
              key={tab.id}
              ref={(el) => {
                if (el) tabRefs.current[i] = el;
              }}
              onClick={() => handleTabClick(tab, i)}
              disabled={tab.disabled}
              aria-label={tab.label}
              className={cn(
                "relative px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                isActive
                  ? "bg-card text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
                tab.disabled && "opacity-50 cursor-not-allowed",
              )}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              aria-disabled={tab.disabled}
              tabIndex={isActive ? 0 : -1}
            >
              <span className="flex items-center gap-2">
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={cn(
                      "px-1.5 py-0.5 text-xs font-semibold rounded-full",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Panel */}
      <div
        id={`tabpanel-${currentTab?.id}`}
        className="bg-card rounded-b-lg rounded-tr-lg border border-border border-t-0 p-6"
        role="tabpanel"
        aria-labelledby={`tab-${currentTab?.id}`}
        tabIndex={0}
      >
        {currentTab?.content || (
          <div className="text-center text-muted-foreground py-8">
            No content available
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Simple Tabs variant (no border/card styling)
 */
export function SimpleTabs({ tabs, defaultTab, onChange }: TabsProps) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.id);
  const currentTab = tabs.find((t) => t.id === active);

  const handleTabClick = (tab: Tab) => {
    if (tab.disabled) return;
    setActive(tab.id);
    onChange?.(tab.id);
  };

  return (
    <div className="simple-tabs">
      <div className="flex gap-1 mb-4" role="tablist">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button type="button"
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              disabled={tab.disabled}
              aria-label={tab.label}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                tab.disabled && "opacity-50 cursor-not-allowed",
              )}
              role="tab"
              aria-selected={isActive}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel">{currentTab?.content}</div>
    </div>
  );
}

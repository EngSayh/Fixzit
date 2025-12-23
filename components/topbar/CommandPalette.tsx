"use client";

import React, { useEffect, useRef } from "react";
import { X, Search } from "@/components/ui/icons";
import Portal from "@/components/Portal";
import { useTranslation } from "@/contexts/TranslationContext";
import type { GlobalSearchResult } from "./types";
import type {
  QuickActionConfig,
  SavedSearchConfig,
} from "@/config/topbar-modules";

interface CommandPaletteProps {
  open: boolean;
  query: string;
  onQueryChange: (_value: string) => void;
  loading: boolean;
  results: GlobalSearchResult[];
  savedSearches: SavedSearchConfig[];
  quickActions: QuickActionConfig[];
  scope: "module" | "all";
  onScopeChange: (_scope: "module" | "all") => void;
  moduleLabel: string;
  placeholder: string;
  onClose: () => void;
  onResultClick: (_href: string) => void;
  onActionClick: (_href: string) => void;
  onSavedSearchSelect: (_search: SavedSearchConfig) => void;
}

export function CommandPalette({
  open,
  query,
  onQueryChange,
  loading,
  results,
  savedSearches,
  quickActions,
  scope,
  onScopeChange,
  moduleLabel,
  placeholder,
  onClose,
  onResultClick,
  onActionClick,
  onSavedSearchSelect,
}: CommandPaletteProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      queueMicrotask(() => inputRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm p-4">
        <div
          role="dialog"
          aria-modal="true"
          className="mx-auto flex max-w-3xl flex-col rounded-2xl bg-card text-card-foreground shadow-2xl border border-border h-[70vh]"
        >
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Search
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/70 text-start"
            />
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => onScopeChange("module")}
                className={`rounded-full px-2 py-1 ${
                  scope === "module"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {moduleLabel}
              </button>
              <button
                type="button"
                onClick={() => onScopeChange("all")}
                className={`rounded-full px-2 py-1 ${
                  scope === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {t("search.scope.all", "All")}
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground hover:bg-muted/80"
              aria-label={t("common.close", "Close")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-4 md:grid-cols-[220px_1fr]">
            <div className="space-y-4 overflow-y-auto border border-border rounded-xl p-3">
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">
                  {t("search.saved.title", "Saved searches")}
                </div>
                <div className="mt-2 space-y-2">
                  {savedSearches.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t("search.saved.empty", "No saved searches")}
                    </p>
                  )}
                  {savedSearches.map((saved) => (
                    <button
                      key={saved.id}
                      type="button"
                      className="w-full rounded-lg border border-border px-3 py-2 text-start text-sm hover:bg-muted"
                      onClick={() => onSavedSearchSelect(saved)}
                    >
                      <div className="font-medium">
                        {t(saved.labelKey, saved.fallbackLabel)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {saved.query}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">
                  {t("search.quickActions", "Quick actions")}
                </div>
                <div className="mt-2 space-y-2">
                  {quickActions.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t("search.quickActions.empty", "No actions available")}
                    </p>
                  )}
                  {quickActions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      className="w-full rounded-lg border border-border px-3 py-2 text-start text-sm hover:bg-muted"
                      onClick={() => onActionClick(action.href)}
                    >
                      {t(action.labelKey, action.fallbackLabel)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col overflow-hidden rounded-xl border border-border">
              <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs text-muted-foreground">
                {loading
                  ? t("search.results.loading", "Searching…")
                  : t("search.results.title", "Results")}
              </div>
              <div className="flex-1 overflow-y-auto">
                {loading && (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    {t("search.results.loading", "Searching…")}
                  </div>
                )}
                {!loading && results.length === 0 && (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    {query
                      ? t("search.results.empty", "No matches yet")
                      : t("search.results.hint", "Start typing to search")}
                  </div>
                )}
                {!loading && results.length > 0 && (
                  <ul className="divide-y divide-border">
                    {results.map((result) => (
                      <li key={`${result.entity}-${result.id}`}>
                        <button
                          type="button"
                          onClick={() => onResultClick(result.href)}
                          className="flex w-full flex-col gap-1 px-4 py-3 text-start hover:bg-muted"
                        >
                          <span className="text-sm font-medium text-foreground">
                            {result.title}
                          </span>
                          {result.subtitle && (
                            <span className="text-xs text-muted-foreground">
                              {result.subtitle}
                            </span>
                          )}
                          <span className="text-[11px] uppercase text-muted-foreground/80">
                            {result.entity}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

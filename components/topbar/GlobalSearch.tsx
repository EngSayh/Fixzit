'use client';
"use client";

import React, { useState, useEffect, useRef, useId, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Command } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTopBar } from "@/contexts/TopBarContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { CommandPalette } from "./CommandPalette";
import type { GlobalSearchResult } from "./types";
import { usePermittedQuickActions } from "./usePermittedQuickActions";
import { logger } from "@/lib/logger";
import { fetchWithAuth } from "@/lib/http/fetchWithAuth";
import type { SavedSearchConfig } from "@/config/topbar-modules";

interface GlobalSearchProps {
  onResultClick?: () => void;
}

const SEARCH_SCOPE_KEY = "fixzit:searchScope";

export default function GlobalSearch({
  onResultClick,
}: GlobalSearchProps = {}) {
  const router = useRouter();
  const { data: session } = useSession();
  const sessionUser = session?.user as
    | { id?: string; orgId?: string }
    | undefined;
  const scopeStorageKey = `${SEARCH_SCOPE_KEY}:${sessionUser?.orgId ?? "global"}:${sessionUser?.id ?? "anonymous"}`;
  const {
    app,
    module,
    moduleLabelKey,
    moduleFallbackLabel,
    searchPlaceholderKey,
    searchPlaceholderFallback,
    searchEntities,
    appSearchEntities,
    quickActions,
    savedSearches,
  } = useTopBar();
  const permittedActions = usePermittedQuickActions(quickActions);
  const { t, isRTL } = useTranslation();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [commandOpen, setCommandOpen] = useState(false);
  const [scope, setScopeState] = useState<"module" | "all">(() => {
    if (typeof window === "undefined") return "module";
    const stored = window.localStorage.getItem(scopeStorageKey);
    return stored === "all" ? "all" : "module";
  });

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const debounceRef = useRef<NodeJS.Timeout>();

  const placeholder = t(searchPlaceholderKey, searchPlaceholderFallback);
  const moduleLabel = t(moduleLabelKey, moduleFallbackLabel);
  const scopeEntities = scope === "module" ? searchEntities : appSearchEntities;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(scopeStorageKey);
    setScopeState(stored === "all" ? "all" : "module");
  }, [scopeStorageKey]);

  const persistScope = useCallback(
    (next: "module" | "all") => {
      setScopeState(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(scopeStorageKey, next);
      }
    },
    [scopeStorageKey],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [results]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setOpen(false);
      setError(null);
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          app,
          module,
          scope,
          q: trimmed,
          entities: scopeEntities.join(","),
        });
        const response = await fetchWithAuth(`/api/search?${params.toString()}`);
        if (!response.ok) throw new Error("Search request failed");
        const data = await response.json();
        setResults(data.results || []);
        setOpen(true);
      } catch (err: unknown) {
        import("../../lib/logger")
          .then(({ logError }) => {
            logError("Search failed", err as Error, {
              component: "GlobalSearch",
              action: "handleSearch",
              query,
            });
          })
          .catch((logErr) => {
            logger.error("Failed to import logger:", logErr);
          });
        setError(t("search.error.generic", "Search failed. Please try again."));
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, app, module, scope, scopeEntities, t]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
        return;
      }
      if (event.key === "Escape" && commandOpen) {
        setCommandOpen(false);
        return;
      }
      if (event.key === "Escape" && open) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [commandOpen, open]);

  const handleResultNavigate = (href: string) => {
    setOpen(false);
    setCommandOpen(false);
    setResults([]);
    setError(null);
    setQuery("");
    onResultClick?.();
    router.push(href);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[activeIndex]) {
        handleResultNavigate(results[activeIndex].href);
      }
    }
  };

  const handleSavedSearchSelect = (saved: SavedSearchConfig) => {
    if (saved.scope && saved.scope !== scope) {
      persistScope(saved.scope);
    }
    setQuery(saved.query);
    setCommandOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={searchRef} className="relative flex-1 max-w-xl">
      <div className="relative">
        <Search
          className={`absolute ${isRTL ? "end-3" : "start-3"} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => query && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-label={t("search.global", "Global search")}
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-activedescendant={
            open && results[activeIndex]
              ? `${listboxId}-${activeIndex}`
              : undefined
          }
          aria-autocomplete="list"
          aria-haspopup="listbox"
          className={`w-full ${isRTL ? "pe-10 ps-20" : "ps-10 pe-20"} rounded-md border border-input bg-background py-2 text-sm text-foreground focus:border-transparent focus:ring-2 focus:ring-primary`}
        />
        <div
          className={`absolute ${isRTL ? "start-3" : "end-3"} top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground`}
        >
          <Command className="h-3 w-3" />
          <span>K</span>
        </div>
      </div>
      <div className="mt-1 flex justify-end gap-2 text-[11px] text-muted-foreground">
        <button
          type="button"
          onClick={() => persistScope("module")}
          className={`rounded-full px-2 py-0.5 ${scope === "module" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
        >
          {moduleLabel}
        </button>
        <button
          type="button"
          onClick={() => persistScope("all")}
          className={`rounded-full px-2 py-0.5 ${scope === "all" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
        >
          {t("search.scope.all", "All")}
        </button>
      </div>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          className={`absolute top-full ${isRTL ? "end-0" : "start-0"} z-50 mt-1 max-h-80 min-w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-lg`}
        >
          {loading && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {t("search.results.loading", "Searching…")}
            </div>
          )}
          {!loading && error && (
            <div className="p-4 text-center text-sm text-destructive">
              {error}
            </div>
          )}
          {!loading && !error && results.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {t("search.results.empty", "No results found")}
            </div>
          )}
          {!loading && !error && results.length > 0 && (
            <div className="py-2">
              {results.map((result, index) => (
                <div
                  key={`${result.entity}-${result.id}`}
                  id={`${listboxId}-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  onClick={() => handleResultNavigate(result.href)}
                  className={`cursor-pointer px-4 py-3 text-sm hover:bg-accent ${
                    index === activeIndex ? "bg-accent" : ""
                  }`}
                >
                  <div
                    className={`flex items-start gap-3 text-start ${isRTL ? "flex-row-reverse" : ""}`}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-foreground">
                        {result.title}
                      </div>
                      {result.subtitle && (
                        <div className="text-xs text-muted-foreground">
                          {result.subtitle}
                        </div>
                      )}
                    </div>
                    <div className="text-[11px] uppercase text-muted-foreground/80">
                      {result.entity}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <CommandPalette
        open={commandOpen}
        query={query}
        onQueryChange={setQuery}
        loading={loading}
        results={results}
        savedSearches={savedSearches}
        quickActions={permittedActions}
        scope={scope}
        onScopeChange={persistScope}
        moduleLabel={moduleLabel}
        placeholder={placeholder}
        onClose={() => setCommandOpen(false)}
        onResultClick={handleResultNavigate}
        onActionClick={handleResultNavigate}
        onSavedSearchSelect={handleSavedSearchSelect}
      />
    </div>
  );
}

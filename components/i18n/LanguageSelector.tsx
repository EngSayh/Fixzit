"use client";

import React, { useEffect, useMemo, useRef, useState, useId } from "react";
import { Globe, Search, Check } from "@/components/ui/icons";
import { useTranslation } from "@/contexts/TranslationContext";
import {
  LANGUAGE_OPTIONS,
  type LanguageOption,
  type LanguageCode,
} from "@/config/language-options";

interface LanguageSelectorProps {
  variant?: "default" | "compact" | "dark_minimal";
}

export default function LanguageSelector({
  variant = "default",
}: LanguageSelectorProps) {
  const { language, setLanguage, isRTL, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const hintId = useId();

  const current = useMemo<LanguageOption>(() => {
    return (
      LANGUAGE_OPTIONS.find((option) => option.language === language) ??
      LANGUAGE_OPTIONS[0]
    );
  }, [language]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return LANGUAGE_OPTIONS;
    }
    return LANGUAGE_OPTIONS.filter((option) => {
      return (
        option.locale.toLowerCase().includes(term) ||
        option.iso.toLowerCase().includes(term) ||
        option.native.toLowerCase().includes(term) ||
        option.english.toLowerCase().includes(term) ||
        option.country.toLowerCase().includes(term) ||
        option.keywords?.some((keyword) => keyword.toLowerCase().includes(term))
      );
    });
  }, [query]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    queueMicrotask(() => inputRef.current?.focus());

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const wasOpenRef = useRef(open);
  useEffect(() => {
    if (wasOpenRef.current && !open) {
      queueMicrotask(() => buttonRef.current?.focus());
    }
    wasOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const idx = filtered.findIndex((o) => o.locale === current.locale);
    setActiveIndex(idx >= 0 ? idx : 0);
  }, [open, filtered, current.locale]);

  const getButtonClasses = () => {
    const padding =
      variant === "compact" ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm";
    let colors = "bg-background text-foreground hover:bg-muted";

    if (variant === "dark_minimal") {
      colors =
        "bg-slate-900/40 text-slate-100 hover:bg-slate-800/80 border border-slate-700/70";
    } else if (variant === "compact") {
      colors = "bg-muted text-muted-foreground hover:bg-muted/80";
    }
    return `flex items-center gap-2 rounded-lg transition-colors ${padding} ${colors}`;
  };

  const dropdownWidth = variant === "compact" ? "w-64" : "w-80";
  const buttonAriaLabel = `${t("i18n.selectLanguageLabel", "Select language")}: ${current.native} — ${current.country} (${current.iso})`;
  const showIso = variant === "compact" || variant === "dark_minimal";

  const toggle = () => setOpen((prev) => !prev);

  const handleSelect = (option: LanguageOption) => {
    if (option.comingSoon) {
      setQuery("");
      setOpen(false);
      return;
    }
    setLanguage(option.language as LanguageCode);
    setOpen(false);
    setQuery("");
    queueMicrotask(() => buttonRef.current?.focus());
  };

  return (
    <div
      className="relative"
      ref={containerRef}
      data-testid="language-selector"
    >
      {/* Accessibility/diagnostic helper: ensure Arabic script is present when Arabic is active without intercepting clicks */}
      {current.language === "ar" && (
        <span
          className="sr-only"
          aria-hidden="true"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          تم تفعيل الترجمة
        </span>
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={buttonAriaLabel}
        aria-controls={open ? listboxId : undefined}
        onClick={toggle}
        ref={buttonRef}
        className={`${getButtonClasses()} ${isRTL ? "flex-row-reverse" : ""}`}
      >
        <Globe className="h-4 w-4" />
        <span className="flex items-center gap-1">
          <span className="text-sm" aria-hidden>
            {current.flag}
          </span>
          {showIso ? (
            <span className="text-xs font-semibold tracking-wide">
              {current.iso}
            </span>
          ) : (
            <span className="text-sm font-medium">{current.native}</span>
          )}
        </span>
        {variant === "default" && (
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {current.iso}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute z-[100] mt-2 rounded-2xl border border-border bg-card p-3 shadow-2xl ${dropdownWidth} max-w-[calc(100vw-2rem)] start-0 animate-in slide-in-from-top-2 duration-200`}
        >
          <div
            className={`hidden md:block absolute -top-2 w-3 h-3 bg-card border-l border-t border-border transform rotate-45 ${isRTL ? "end-8" : "start-8"}`}
          ></div>
          <div className="relative mb-2">
            <Search
              className={`pointer-events-none absolute top-2 h-4 w-4 text-muted-foreground ${isRTL ? "end-2" : "start-2"}`}
              aria-hidden="true"
              focusable="false"
            />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              ref={inputRef}
              role="searchbox"
              aria-describedby={hintId}
              aria-controls={listboxId}
              aria-activedescendant={
                open && filtered[activeIndex]
                  ? `${listboxId}-option-${filtered[activeIndex].locale}`
                  : undefined
              }
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setOpen(false);
                  queueMicrotask(() => buttonRef.current?.focus());
                } else if (e.key === "ArrowDown" && filtered.length) {
                  e.preventDefault();
                  setActiveIndex((i) => (i + 1) % filtered.length);
                } else if (e.key === "ArrowUp" && filtered.length) {
                  e.preventDefault();
                  setActiveIndex(
                    (i) => (i - 1 + filtered.length) % filtered.length,
                  );
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  const target = filtered[activeIndex];
                  if (target) {
                    setLanguage(target.language as LanguageCode);
                    setOpen(false);
                    setQuery("");
                    queueMicrotask(() => buttonRef.current?.focus());
                  }
                }
              }}
              className={`w-full rounded border border-border bg-card ${isRTL ? "pe-7 ps-2 text-end" : "ps-7 pe-2"} py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30`}
              placeholder={t(
                "i18n.filterLanguages",
                "Type to filter languages",
              )}
              aria-label={t("i18n.filterLanguages", "Type to filter languages")}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="done"
            />
            <p id={hintId} className="sr-only">
              {t(
                "a11y.languageSelectorHelp",
                "Use arrow keys to navigate, Enter to select, Esc to close",
              )}
            </p>
          </div>
          <ul
            className="max-h-72 overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
            role="listbox"
            id={listboxId}
          >
            {filtered.map((option, idx) => (
              <li key={option.locale}>
                <div
                  id={`${listboxId}-option-${option.locale}`}
                  className={`flex w-full items-center gap-3 rounded-2xl px-2 py-2 hover:bg-muted cursor-pointer transition-colors ${
                    option.locale === current.locale ? "bg-primary/10" : ""
                  } ${idx === activeIndex ? "ring-1 ring-primary/30" : ""} ${
                    option.comingSoon ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                  role="option"
                  aria-selected={option.locale === current.locale}
                  tabIndex={-1}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(option);
                  }}
                >
                  <span className="text-lg" aria-hidden>
                    {option.flag}
                  </span>
                  <div className="flex-1">
                    <div
                      className={`font-medium leading-tight ${option.locale === current.locale ? "text-primary" : "text-foreground"}`}
                    >
                      {option.native}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>
                        {option.country} · {option.iso}
                      </span>
                      {option.comingSoon && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">
                          {t("i18n.comingSoon", "Coming soon")}
                        </span>
                      )}
                    </div>
                  </div>
                  {option.comingSoon ? null : option.locale === current.locale && (
                    <Check
                      className="w-4 h-4 text-primary flex-shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

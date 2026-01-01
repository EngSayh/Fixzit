"use client";

/**
 * Superadmin Header
 * Top bar with user info, settings, and logout
 * 
 * @module components/superadmin/SuperadminHeader
 */

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/useI18n";
import { LogOut, Settings, User, Search, Sun, Moon, Bell, Command, Monitor } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logger } from "@/lib/logger";
import dynamic from "next/dynamic";
import { Select, SelectItem } from "@/components/ui/select";
import { BrandLogo } from "@/components/brand";
import { useThemeCtx } from "@/contexts/ThemeContext";
import {
  LANGUAGE_OPTIONS,
  type LanguageOption,
} from "@/config/language-options";
import type { Locale } from "@/i18n/config";
import { useSuperadminSession } from "./superadmin-session";

const CurrencySelector = dynamic(
  () => import("@/components/i18n/CurrencySelector"),
  { ssr: false }
);

const ENABLED_LOCALES: (LanguageOption & { language: Locale })[] =
  LANGUAGE_OPTIONS.filter(
    (option): option is LanguageOption & { language: Locale } =>
      !option.comingSoon &&
      (option.language === "en" || option.language === "ar"),
  );

function SuperadminLanguageDropdown() {
  const { t, locale, setLocale } = useI18n();
  const active =
    ENABLED_LOCALES.find((option) => option.language === locale) ??
    ENABLED_LOCALES[0];

  const handleChange = (value: string) => {
    const next = ENABLED_LOCALES.find(
      (option) => option.language === value,
    )?.language;
    const normalized: Locale = next === "ar" ? "ar" : "en";
    setLocale(normalized);
  };

  return (
    <Select
      aria-label={t("i18n.selectLanguageLabel")}
      value={active.language}
      onValueChange={handleChange}
      wrapperClassName="min-w-[160px]"
      className="h-10 bg-card text-foreground border-border pe-9 ps-3"
      data-testid="superadmin-language-dropdown"
    >
      {ENABLED_LOCALES.map((option) => (
        <SelectItem key={option.language} value={option.language}>
          {option.flag} {option.native}
        </SelectItem>
      ))}
    </Select>
  );
}

export function SuperadminHeader() {
  const router = useRouter();
  const { t } = useI18n();
  const { theme, setTheme } = useThemeCtx();
  // BUG-001 FIX: Session now provided by server-side layout, no client fetch needed
  const session = useSuperadminSession();
  const [loggingOut, setLoggingOut] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const username = session?.user?.username?.trim() || null;
  const displayName = username || t("superadmin.account");

  // Keyboard shortcut: Cmd/Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle search submit
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && globalSearch.trim()) {
      router.push(`/superadmin/search?q=${encodeURIComponent(globalSearch.trim())}`);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const response = await fetch("/api/superadmin/logout", {
        method: "POST",
      });

      if (response.ok) {
        router.push("/superadmin/login");
      } else {
        logger.warn("[SUPERADMIN] Logout failed", {
          component: "SuperadminHeader",
          action: "logout",
          status: response.status,
        });
      }
    } catch (error) {
      logger.error("[SUPERADMIN] Logout error", error, {
        component: "SuperadminHeader",
        action: "logout",
      });
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 rounded-lg border border-transparent px-2 py-1 transition hover:border-border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-primary"
          aria-label={t("superadmin.goToLanding", "Go to landing")}
          type="button"
        >
          <BrandLogo
            size="sm"
            fetchOrgLogo={false}
            className="rounded-lg"
            priority
          />
        </button>
        <div>
          <h1 className="text-foreground font-semibold text-lg">
            {t("superadmin.title")}
          </h1>
          <p className="text-muted-foreground text-xs">
            {t("superadmin.fullAccess")}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/superadmin/tenants")}
          className="text-muted-foreground hover:text-foreground ms-2"
          aria-label={t("superadmin.switchTenant", "Switch tenant")}
        >
          {t("superadmin.switchTenant", "Switch tenant")}
        </Button>
      </div>

      {/* Center: Global Search with Cmd+K hint */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder={t("superadmin.searchPlaceholder", "Search...")}
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            aria-label={t("superadmin.searchSuperadmin", "Search superadmin")}
            className="ps-10 pe-16 w-64 h-10 bg-muted border-border text-foreground placeholder:text-muted-foreground"
          />
          <kbd className="absolute end-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-muted text-muted-foreground rounded border border-border">
            <Command className="inline h-3 w-3" />K
          </kbd>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle - Cycles: light → dark → system */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
            setTheme(next);
          }}
          className="text-muted-foreground hover:text-foreground"
          title={t("superadmin.themeTitle", `Theme: ${theme} (click to change)`)}
          aria-label={t("superadmin.themeToggle", `Switch theme, currently ${theme}`)}
        >
          {theme === 'light' ? <Sun className="h-4 w-4" /> : theme === 'dark' ? <Moon className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
        </Button>

        {/* Notifications Bell - Badge hidden until we have notification count API */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/superadmin/notifications")}
          className="text-muted-foreground hover:text-foreground relative"
          title={t("superadmin.notificationsTitle", "Notifications")}
          aria-label={t("superadmin.notificationsTitle", "Notifications")}
        >
          <Bell className="h-4 w-4" />
          {/* TODO: Add notification count badge when API is available */}
        </Button>
        {/* Language Selector (dropdown with flags) */}
        <SuperadminLanguageDropdown />

        {/* Currency Selector */}
        <div className="text-muted-foreground">
          <CurrencySelector variant="compact" />
        </div>

        {/* User Badge */}
        <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border border-border">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground text-sm">{displayName}</span>
        </div>

        {/* Settings */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/superadmin/system")}
          className="text-muted-foreground hover:text-foreground"
          aria-label={t("superadmin.settings", "Settings")}
        >
          <Settings className="h-4 w-4" />
        </Button>

        {/* Logout */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={loggingOut}
          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
          aria-label={loggingOut ? t("superadmin.loggingOut", "Logging out") : t("superadmin.logout", "Log out")}
        >
          <LogOut className="h-4 w-4 me-2" />
          {loggingOut ? t("superadmin.loggingOut") : t("superadmin.logout")}
        </Button>
      </div>
    </header>
  );
}

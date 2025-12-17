"use client";

/**
 * Superadmin Header
 * Top bar with user info, settings, and logout
 * 
 * @module components/superadmin/SuperadminHeader
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/useI18n";
import { LogOut, Settings, User, Search, Sun, Moon, Bell, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { logger } from "@/lib/logger";
import dynamic from "next/dynamic";
import { Select, SelectItem } from "@/components/ui/select";
import { BrandLogo } from "@/components/brand";
import { useTheme } from "@/contexts/ThemeContext";
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
      className="h-10 bg-slate-900 text-slate-100 border-slate-700 pe-9 ps-3"
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
  const { theme, setTheme } = useTheme();
  // BUG-001 FIX: Session now provided by server-side layout, no client fetch needed
  const session = useSuperadminSession();
  const [loggingOut, setLoggingOut] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const username = session?.user?.username?.trim() || null;
  const displayName = username || t("superadmin.account");

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
    <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg border border-transparent px-2 py-1 transition hover:border-slate-700 hover:bg-slate-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-blue-600"
          aria-label={t("footer.backHome")}
        >
          <BrandLogo
            size="sm"
            fetchOrgLogo={false}
            className="rounded-lg"
            priority
          />
        </Link>
        <div>
          <h1 className="text-white font-semibold text-lg">
            {t("superadmin.title")}
          </h1>
          <p className="text-slate-400 text-xs">
            {t("superadmin.fullAccess")}
          </p>
        </div>
      </div>

      {/* AcGlobal Search with Cmd+K hint */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="pl-10 pr-16 w-64 h-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded border border-slate-600">
            <Command className="inline h-3 w-3" />K
          </kbd>
        </div>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="text-slate-300 hover:text-white"
          title="Toggle theme"
        >
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>

        {/* Notifications Bell */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/superadmin/notifications")}
          className="text-slate-300 hover:text-white relative"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </Button>

        {/* tions */}
      <div className="flex items-center gap-3">
        {/* Language Selector (dropdown with flags) */}
        <SuperadminLanguageDropdown />

        {/* Currency Selector */}
        <div className="text-slate-300">
          <CurrencySelector variant="compact" />
        </div>

        {/* User Badge */}
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg border border-slate-700">
          <User className="h-4 w-4 text-slate-400" />
          <span className="text-white text-sm">{displayName}</span>
        </div>

        {/* Settings */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/superadmin/system")}
          className="text-slate-300 hover:text-white"
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
        >
          <LogOut className="h-4 w-4 me-2" />
          {loggingOut ? t("superadmin.loggingOut") : t("superadmin.logout")}
        </Button>
      </div>
    </header>
  );
}

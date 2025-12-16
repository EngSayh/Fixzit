"use client";

/**
 * Superadmin Header
 * Top bar with user info, settings, and logout
 * 
 * @module components/superadmin/SuperadminHeader
 */

import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/useI18n";
import { LogOut, Settings, User, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import dynamic from "next/dynamic";

const CurrencySelector = dynamic(
  () => import("@/components/i18n/CurrencySelector"),
  { ssr: false }
);

export function SuperadminHeader() {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const [loggingOut, setLoggingOut] = useState(false);
  const [username, setUsername] = useState<string>("Admin");

  // Fetch superadmin session on mount
  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const response = await fetch("/api/superadmin/session", {
          cache: "no-store",
        });

        if (!response.ok) {
          logger.warn("[SUPERADMIN] Session fetch failed", {
            component: "SuperadminHeader",
            action: "fetch-session",
            status: response.status,
          });
          return;
        }

        const data = await response.json();
        if (isMounted && data?.user?.username) {
          setUsername(data.user.username);
        }
      } catch (error) {
        logger.error("[SUPERADMIN] Session fetch error", error, {
          component: "SuperadminHeader",
          action: "fetch-session",
        });
      }
    };

    void loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

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

  const handleLanguageSwitch = () => {
    const newLocale = locale === "ar" ? "en" : "ar";
    setLocale(newLocale);
    localStorage.setItem("locale", newLocale);
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6">
      {/* Title */}
      <div>
        <h1 className="text-white font-semibold text-lg">
          {t("superadmin.title")}
        </h1>
        <p className="text-slate-400 text-xs">
          {t("superadmin.fullAccess")}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Language Switcher */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLanguageSwitch}
          className="text-slate-300 hover:text-white"
        >
          <Globe className="h-4 w-4 me-2" />
          {locale === "ar" ? "EN" : "العربية"}
        </Button>

        {/* Currency Selector */}
        <div className="text-slate-300">
          <CurrencySelector variant="compact" />
        </div>

        {/* User Badge */}
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg border border-slate-700">
          <User className="h-4 w-4 text-slate-400" />
          <span className="text-white text-sm">{username}</span>
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

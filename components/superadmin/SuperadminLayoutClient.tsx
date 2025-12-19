"use client";

import { usePathname, useRouter } from "next/navigation";
import { I18nProvider } from "@/i18n/I18nProvider";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import type { Locale } from "@/i18n/config";
import { type ReactNode, useEffect } from "react";
import { SuperadminSidebar } from "./SuperadminSidebar";
import { SuperadminHeader } from "./SuperadminHeader";
import { SystemStatusBar } from "./SystemStatusBar";
import { CommandPalette } from "./CommandPalette";
import {
  SuperadminSessionProvider,
  type SuperadminSessionState,
} from "./superadmin-session";

type Props = {
  children: ReactNode;
  initialLocale: Locale;
  initialDict: Record<string, unknown>;
  initialSession?: SuperadminSessionState;
};

export function SuperadminLayoutClient({
  children,
  initialLocale,
  initialDict,
  initialSession = null,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/superadmin/login";
  const isAuthenticated = initialSession?.authenticated ?? false;

  useEffect(() => {
    if (isLoginPage) return;
    if (!isAuthenticated) {
      router.replace("/superadmin/login");
    }
  }, [isAuthenticated, isLoginPage, router]);

  if (!isLoginPage && !isAuthenticated) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <SuperadminSessionProvider value={initialSession}>
      <ThemeProvider>
        <I18nProvider initialLocale={initialLocale} initialDict={initialDict}>
          <CurrencyProvider>
            {isLoginPage ? (
              <div className="min-h-screen bg-background">{children}</div>
            ) : (
              <>
                <div className="min-h-screen bg-background flex pb-7">
                  {/* Sidebar */}
                  <SuperadminSidebar />

                  {/* Main Content Area */}
                  <div className="flex-1 flex flex-col">
                    {/* Header */}
                    <SuperadminHeader />

                    {/* Page Content */}
                    <main className="flex-1 overflow-auto">{children}</main>
                  </div>
                </div>
                
                {/* System Status Bar - Replaces marketing footer */}
                <SystemStatusBar />
                
                {/* Command Palette (Cmd+K) */}
                <CommandPalette />
              </>
            )}
          </CurrencyProvider>
        </I18nProvider>
      </ThemeProvider>
    </SuperadminSessionProvider>
  );
}

"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { I18nProvider } from "@/i18n/I18nProvider";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import type { Locale } from "@/i18n/config";
import type { ReactNode } from "react";
import { SuperadminSidebar } from "./SuperadminSidebar";
import { SuperadminHeader } from "./SuperadminHeader";

const Footer = dynamic(() => import("@/components/Footer"), { ssr: false });

type Props = {
  children: ReactNode;
  initialLocale: Locale;
  initialDict: Record<string, unknown>;
};

export function SuperadminLayoutClient({
  children,
  initialLocale,
  initialDict,
}: Props) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/superadmin/login";

  return (
    <I18nProvider initialLocale={initialLocale} initialDict={initialDict}>
      <CurrencyProvider>
        {isLoginPage ? (
          <div className="min-h-screen bg-background">{children}</div>
        ) : (
          <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            <SuperadminSidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <SuperadminHeader />

              {/* Page Content */}
              <main className="flex-1 overflow-auto">{children}</main>

              {/* Universal Footer */}
              <Footer />
            </div>
          </div>
        )}
      </CurrencyProvider>
    </I18nProvider>
  );
}

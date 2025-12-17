import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import enDict from "@/i18n/dictionaries/en";
import arDict from "@/i18n/dictionaries/ar";
import { getServerI18n } from "@/lib/i18n/server";
import { normalizeLocale } from "@/i18n/normalize-locale";
import type { Locale } from "@/i18n/config";
import { SuperadminLayoutClient } from "@/components/superadmin/SuperadminLayoutClient";
import { getSuperadminSessionFromCookies } from "@/lib/superadmin/auth";

const DICTIONARIES: Record<Locale, Record<string, unknown>> = {
  en: enDict,
  ar: arDict,
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SuperadminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { locale: serverLocale } = await getServerI18n();
  const superadminSession = await getSuperadminSessionFromCookies();

  // BUG-002 FIX: Server-side auth enforcement
  // Redirect to login if not authenticated (prevents client-side polling race conditions)
  if (!superadminSession || !superadminSession.username) {
    redirect("/superadmin/login");
  }

  const initialSession = superadminSession
    ? {
        authenticated: true,
        user: {
          username: superadminSession.username,
          role: superadminSession.role,
        },
      }
    : null;
  // ✅ Use normalizeLocale to handle ar-SA, AR-SA, ar_SA → ar
  const normalizedLocale: Locale = normalizeLocale(serverLocale);
  const initialDict = DICTIONARIES[normalizedLocale] ?? DICTIONARIES.en;

  return (
    <SuperadminLayoutClient
      initialLocale={normalizedLocale}
      initialDict={initialDict}
      initialSession={initialSession}
    >
      {children}
    </SuperadminLayoutClient>
  );
}

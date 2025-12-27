import React, { type ReactNode } from "react";
import { headers } from "next/headers";
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
  const hdrs = await headers();
  
  // Get the actual URL path from various header sources
  // Next.js 14+ sets x-pathname, Vercel sets x-url, or we fall back to referer
  const currentPath =
    hdrs.get("x-pathname") ||
    hdrs.get("x-invoke-path") ||
    hdrs.get("x-matched-path") ||
    hdrs.get("x-url") ||
    hdrs.get("next-url") ||
    hdrs.get("referer") ||
    "";

  // Extract just the pathname from full URLs (referer may be full URL)
  const pathname = currentPath.includes("://")
    ? new URL(currentPath).pathname
    : currentPath;

  // Check if we're on the login page
  const isLoginPage =
    typeof pathname === "string" &&
    pathname.toLowerCase().includes("/superadmin/login");
  
  // Path detection status (for debugging)
  const pathDetectionFailed = !pathname || pathname === "";

  const { locale: serverLocale } = await getServerI18n();
  const superadminSession = await getSuperadminSessionFromCookies();

  // Debug logging for troubleshooting auth issues
  if (!superadminSession && !isLoginPage) {
    // eslint-disable-next-line no-console -- Debug logging for auth troubleshooting
    console.warn("[SUPERADMIN LAYOUT] No session found", {
      pathname: pathname || "<empty>",
      isLoginPage,
      pathDetectionFailed,
      willRedirect: !isLoginPage,
    });
  }

  // BUG-002 FIX: Server-side auth enforcement
  // CRITICAL: Even if path detection fails, if we have no session and this isn't
  // explicitly the login page, we must redirect. The middleware already allows
  // login page access, so if we got here with no session, redirect to login.
  if (
    !isLoginPage &&
    (!superadminSession ||
      !superadminSession.username ||
      superadminSession.expiresAt < Date.now())
  ) {
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

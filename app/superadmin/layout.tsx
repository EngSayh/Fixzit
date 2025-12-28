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

  // Extract just the pathname from URLs (handles both full URLs and relative paths with query strings)
  // Examples handled:
  //   "https://fixzit.co/superadmin/login?reason=no_session" → "/superadmin/login"
  //   "/superadmin/login?reason=no_session" → "/superadmin/login"
  //   "/superadmin/login" → "/superadmin/login"
  let pathname = currentPath;
  if (currentPath.includes("://")) {
    // Full URL - use URL parser
    pathname = new URL(currentPath).pathname;
  } else if (currentPath.includes("?") || currentPath.includes("#")) {
    // Relative URL with query string or hash - strip them
    pathname = currentPath.split(/[?#]/)[0];
  }

  // Path detection status (for debugging)
  const pathDetectionFailed = !pathname || pathname === "";

  // Check if we're on the login page (exact match with optional trailing slash)
  // Using regex to avoid false positives like /superadmin/login-history
  const isLoginPage =
    typeof pathname === "string" &&
    /^\/superadmin\/login\/?$/i.test(pathname);

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

  // FIX: If user is already authenticated and on login page, redirect to issues
  // This prevents the confusing UX of seeing the login form while already logged in
  if (
    isLoginPage &&
    superadminSession &&
    superadminSession.username &&
    superadminSession.expiresAt > Date.now()
  ) {
    redirect("/superadmin/issues");
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

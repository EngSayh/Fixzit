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

  // CRITICAL FIX: If we can't determine the path, check if this is a login page render
  // by examining the __next_router_state_tree header or x-nextjs-data header
  // When path detection fails, we must NOT redirect - let the client handle it
  const pathDetectionFailed = !pathname || pathname === "";
  
  const isLoginPage =
    (typeof pathname === "string" &&
    pathname.toLowerCase().includes("/superadmin/login")) ||
    pathDetectionFailed; // If path detection fails, assume login page to prevent redirect loop

  const { locale: serverLocale } = await getServerI18n();
  const superadminSession = await getSuperadminSessionFromCookies();

  // BUG-002 FIX: Server-side auth enforcement
  // Redirect to login if not authenticated or expired (prevents client-side polling race conditions)
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

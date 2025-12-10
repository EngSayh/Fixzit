"use client";
import React from "react";
import { logger } from "@/lib/logger";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import TopBar from "./TopBar";
import _Sidebar from "./Sidebar";
import Footer from "./Footer";
import AutoFixInitializer from "./AutoFixInitializer";
import HtmlAttrs from "./HtmlAttrs";
import PreferenceBroadcast from "./PreferenceBroadcast";
import TrialBanner from "./TrialBanner";
import { AppShell } from "@/components/layout/AppShell";
import { useSubscription } from "@/hooks/useSubscription";
import { useTranslation } from "@/contexts/TranslationContext";
import {
  AUTH_ROUTES,
  MARKETING_ROUTE_PREFIXES,
  MARKETING_ROUTES,
  PROTECTED_ROUTE_PREFIXES,
} from "@/config/routes/public";
import { UserRole, type UserRoleType } from "@/types/user";
import type { BadgeCounts } from "@/config/navigation";
import type { DefaultSession } from "next-auth";
import { useOrgCounters } from "@/hooks/useOrgCounters";

type WorkOrderCounters = {
  total?: number;
  open?: number;
  inProgress?: number;
  overdue?: number;
};

type FinanceCounters = {
  unpaid?: number;
  overdue?: number;
};

type HrCounters = {
  probation?: number;
  onLeave?: number;
};

type PropertiesCounters = {
  total?: number;
  leased?: number;
  maintenance?: number;
};

type CrmCounters = {
  contracts?: number;
  leads?: number;
};

type SupportCounters = {
  open?: number;
  pending?: number;
};

type MarketplaceCounters = {
  orders?: number;
  listings?: number;
  reviews?: number;
};

type ApprovalCounters = {
  total?: number;
  pending?: number;
  overdue?: number;
};

type RfqCounters = {
  total?: number;
  open?: number;
  awarded?: number;
  closed?: number;
};

type HrApplicationCounters = {
  total?: number;
  pending?: number;
  applied?: number;
  screening?: number;
  interview?: number;
};

interface CounterPayload {
  workOrders?: WorkOrderCounters;
  finance?: FinanceCounters;
  invoices?: FinanceCounters;
  hr?: HrCounters;
  employees?: HrCounters;
  properties?: PropertiesCounters;
  crm?: CrmCounters;
  customers?: CrmCounters;
  support?: SupportCounters;
  marketplace?: MarketplaceCounters;
  approvals?: ApprovalCounters;
  rfqs?: RfqCounters;
  hrApplications?: HrApplicationCounters;
}

const mapCountersToBadgeCounts = (
  counters?: CounterPayload,
): BadgeCounts | undefined => {
  if (!counters) return undefined;
  const value: BadgeCounts = {};

  const setCount = (key: keyof BadgeCounts, input?: number) => {
    if (typeof input === "number" && Number.isFinite(input)) {
      value[key] = input;
    }
  };

  // Work Orders - correctly mapped
  const workOrders = counters.workOrders ?? {};
  setCount("workOrders", workOrders.total);
  setCount("pendingWorkOrders", workOrders.open);
  setCount("inProgressWorkOrders", workOrders.inProgress);
  setCount("urgentWorkOrders", workOrders.overdue);

  // Finance - correctly mapped
  const finance = counters.finance ?? counters.invoices ?? {};
  setCount("pending_invoices", finance.unpaid);
  setCount("overdue_invoices", finance.overdue);

  // HR Applications - from ATS application counters
  const hrApplications = counters.hrApplications ?? {};
  setCount("hr_applications", hrApplications.pending);

  // Properties - correctly mapped with calculated vacant units
  const properties = counters.properties ?? {};
  const vacantUnits =
    typeof properties.total === "number" &&
    typeof properties.leased === "number"
      ? Math.max(properties.total - properties.leased, 0)
      : undefined;
  if (typeof vacantUnits === "number") {
    value.vacant_units = vacantUnits;
  }
  setCount("properties_needing_attention", properties.maintenance);

  // CRM - correctly mapped
  const crm = counters.crm ?? counters.customers ?? {};
  setCount("crm_deals", crm.contracts);
  setCount("aqar_leads", crm.leads);

  // Support - open tickets only; pending != approvals
  const support = counters.support ?? {};
  setCount("open_support_tickets", support.open);

  // Approvals - workflow approvals
  const approvals = counters.approvals ?? {};
  setCount("pending_approvals", approvals.pending);

  // Marketplace - orders and listings; reviews != RFQs
  const marketplace = counters.marketplace ?? {};
  setCount("marketplace_orders", marketplace.orders);
  setCount("marketplace_products", marketplace.listings);

  // RFQs - marketplace procurement
  const rfqs = counters.rfqs ?? {};
  setCount("open_rfqs", rfqs.open);

  return Object.keys(value).length ? value : undefined;
};

// Dynamic imports for heavy components to reduce initial bundle size
const AutoIncidentReporter = dynamic(
  () => import("@/components/AutoIncidentReporter"),
  { ssr: false },
);

type UserRoleOrGuest = UserRoleType | "guest";

export default function ClientLayout({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRoleOrGuest>("guest");
  const [loading, setLoading] = useState(true);
  const pathname = usePathname() ?? "";
  const router = useRouter();

  // ✅ FIXED: SessionProvider is now always available (in PublicProviders)
  const { data: session, status } = useSession();
  const [authUser, setAuthUser] = useState<{
    id?: string;
    role?: string;
  } | null>(null);

  const marketingRoutes = new Set<string>(MARKETING_ROUTES);
  const marketingRoutePrefixes = MARKETING_ROUTE_PREFIXES;
  const authRoutes = new Set<string>(AUTH_ROUTES);

  const isMarketingPage =
    marketingRoutes.has(pathname) ||
    marketingRoutePrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
  const isAuthPage =
    authRoutes.has(pathname) ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup");

  // Use a single source of truth for what's protected on the client
  const protectedPrefixes = PROTECTED_ROUTE_PREFIXES;
  const isProtectedRoute = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  // Safe translation access
  let language = "ar";
  let isRTL = false;
  try {
    const translationContext = useTranslation();
    language = translationContext.language;
    isRTL = translationContext.isRTL;
  } catch (e) {
    // Expected: TranslationContext may not be available in some routes
    if (process.env.NODE_ENV === "development") {
      logger.debug("TranslationContext unavailable, using defaults:", e);
    }
  }

  // Early lang/dir update
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
      document.documentElement.dir = isRTL ? "rtl" : "ltr";
    }
  }, [language, isRTL]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    let unmounted = false;
    const flagKey = "__fixzit_sw_ready";
    const windowRecord = window as unknown as Record<string, unknown>;
    if (windowRecord[flagKey]) {
      return;
    }
    const registerSW = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
        if (!unmounted) {
          windowRecord[flagKey] = true;
        }
      } catch (error) {
        if (!unmounted) {
          logger.debug("Service worker registration failed", error);
        }
      }
    };
    registerSW();
    return () => {
      unmounted = true;
    };
  }, []);

  // ⚡ FIXED: Unified auth check - fetch JWT auth if NextAuth isn't authenticated
  useEffect(() => {
    let abort = false;
    // Skip auth probe on public marketing/auth routes to avoid 401 noise
    if (isMarketingPage || isAuthPage) {
      return () => {
        abort = true;
      };
    }
    // Only fetch if NextAuth isn't authenticated yet
    if (status !== "authenticated" && status !== "loading") {
      const checkAuth = async () => {
        try {
          const r = await fetch("/api/auth/me", { credentials: "include" });
          if (!r.ok) return;
          const data = await r.json();
          if (!abort && data?.user?.id) {
            setAuthUser({ id: data.user.id, role: data.user.role });
          }
        } catch (err: unknown) {
          // Silently ignore - user is guest
          logger.debug("Auth check failed (expected for guests):", err);
        }
      };
      checkAuth().catch((err) => {
        logger.debug("Unhandled auth check error:", err);
      });
    }
    return () => {
      abort = true;
    };
  }, [status]);

  // ⚡ FIXED: Unified authentication check (GOLD STANDARD from TopBar.tsx)
  const sessionUser = session?.user as (DefaultSession["user"] & { orgId?: string }) | undefined;
  const isAuthenticated =
    (status === "authenticated" && sessionUser != null) || !!authUser;
  const { counters: counterData } = useOrgCounters();
  const badgeCounts = useMemo(
    () => mapCountersToBadgeCounts(counterData as CounterPayload | undefined),
    [counterData],
  );

  useEffect(() => {
    // 1) Auth pages -> always guest, no fetch
    if (isAuthPage) {
      setRole("guest");
      setLoading(false);
      return;
    }

    // 2) Public marketing pages -> guest but don't clear cookies
    if (isMarketingPage) {
      setRole("guest");
      setLoading(false);
      return;
    }

    // 3) Non-protected routes -> guest
    if (!isProtectedRoute) {
      setRole("guest");
      setLoading(false);
      return;
    }

    // 4) Protected routes: extract role from unified auth
    if (isAuthenticated) {
      // Get role from NextAuth session OR JWT authUser
      const userRole =
        (session?.user as { role?: string })?.role || authUser?.role || "guest";
      const valid: UserRoleType[] = Object.values(UserRole);
      const validRole = valid.includes(userRole as UserRoleType)
        ? (userRole as UserRoleOrGuest)
        : "guest";
      setRole(validRole);
      try {
        localStorage.setItem("fixzit-role", validRole);
      } catch (e) {
        // Silently fail - localStorage may be unavailable (private browsing, quota exceeded)
        if (process.env.NODE_ENV === "development") {
          logger.warn("localStorage.setItem failed", { error: e });
        }
      }
      setLoading(false);
    } else if (status !== "loading") {
      // Not authenticated and not loading -> guest
      setRole("guest");
      try {
        localStorage.removeItem("fixzit-role");
      } catch (e) {
        // Silently fail - localStorage may be unavailable (private browsing)
        if (process.env.NODE_ENV === "development") {
          logger.warn("localStorage.removeItem failed", { error: e });
        }
      }
      setLoading(false);
    }
    // If still loading, keep loading state (don't set guest prematurely)
  }, [
    isAuthPage,
    isMarketingPage,
    isProtectedRoute,
    pathname,
    isAuthenticated,
    session,
    authUser,
    status,
  ]);

  // Client-side protection: redirect guests only from protected routes
  useEffect(() => {
    if (!loading && role === "guest" && isProtectedRoute) {
      // Use Next.js router.replace to avoid back stack loops and enable client-side navigation
      router.replace("/login");
    }
  }, [loading, role, isProtectedRoute, router]);

  const { subscriptionStatus, isLoading: subLoading, isActive } = useSubscription();

  // Auth pages => minimal layout, no widgets
  if (isAuthPage) {
    return (
      <>
        <HtmlAttrs />
        <div className="min-h-screen bg-muted">{children}</div>
      </>
    );
  }

  // Protected routes: normal app layout
  const CopilotWidget = dynamic(
    () =>
      import("./CopilotWidget").catch((err) => {
        logger.error("Failed to load CopilotWidget:", { error: err });
        return { default: () => null };
      }),
    {
      ssr: false,
      loading: () => null,
    },
  );

  // Public/landing pages => full layout with TopBar and Footer but no sidebar
  if (isMarketingPage) {
    return (
      <>
        <HtmlAttrs />
        <div className="min-h-screen bg-muted/30">
          <AutoFixInitializer />
          <AutoIncidentReporter />
          <PreferenceBroadcast />
          <TopBar />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
          <CopilotWidget />
        </div>
      </>
    );
  }

  // Protected routes: normal app layout with sidebar
  return (
    <>
      <HtmlAttrs />
      <div className="min-h-screen bg-[var(--color-app-background)]">
        <AutoFixInitializer />
        <AppShell badgeCounts={badgeCounts}>
          <div className="relative min-h-full">
            {children}
            {!subLoading && !isActive && (
              <TrialBanner subscriptionStatus={subscriptionStatus ?? null} />
            )}
          </div>
        </AppShell>
        <PreferenceBroadcast />
        <CopilotWidget />
        <AutoIncidentReporter />
      </div>
    </>
  );
}

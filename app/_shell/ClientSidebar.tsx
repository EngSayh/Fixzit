"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Sidebar from "@/components/Sidebar";
import type { BadgeCounts } from "@/config/navigation";
import { useOrgCounters } from "@/hooks/useOrgCounters";
import { logger } from "@/lib/logger";

type NumericDict = Record<string, number | undefined>;

type CounterPayload = {
  workOrders?: {
    total?: number;
    open?: number;
    inProgress?: number;
    overdue?: number;
  };
  finance?: NumericDict;
  invoices?: NumericDict;
  hr?: NumericDict;
  properties?: NumericDict;
  crm?: NumericDict;
  support?: NumericDict;
  marketplace?: NumericDict;
  approvals?: NumericDict;
  rfqs?: NumericDict;
  hrApplications?: NumericDict;
};

const mapCountersToBadgeCounts = (
  counters?: CounterPayload,
): BadgeCounts | undefined => {
  if (!counters || typeof counters !== "object") return undefined;

  const value: BadgeCounts = {};
  const setCount = (key: keyof BadgeCounts, input?: number) => {
    if (typeof input === "number" && Number.isFinite(input)) value[key] = input;
  };

  const {
    workOrders,
    finance,
    invoices,
    properties,
    crm,
    support,
    marketplace,
    approvals,
    rfqs,
    hrApplications,
  } = counters;

  // Work Orders - correctly mapped
  setCount("workOrders", workOrders?.total);
  setCount("pendingWorkOrders", workOrders?.open);
  setCount("inProgressWorkOrders", workOrders?.inProgress);
  setCount("urgentWorkOrders", workOrders?.overdue);

  // Finance - correctly mapped
  const financeSource = finance ?? invoices ?? {};
  setCount("pending_invoices", financeSource?.unpaid);
  setCount("overdue_invoices", financeSource?.overdue);

  // HR Applications - from ATS application counters
  setCount("hr_applications", hrApplications?.pending);

  // Properties - correctly mapped
  setCount("properties_needing_attention", properties?.maintenance);

  // CRM - correctly mapped
  setCount("crm_deals", crm?.contracts);
  setCount("aqar_leads", crm?.leads);

  // Support - open tickets only; pending != approvals
  setCount("open_support_tickets", support?.open);

  // Approvals - workflow approvals
  setCount("pending_approvals", approvals?.pending);

  // Marketplace - orders and listings; reviews != RFQs
  setCount("marketplace_orders", marketplace?.orders);
  setCount("marketplace_products", marketplace?.listings);

  // RFQs - marketplace procurement
  setCount("open_rfqs", rfqs?.open);

  return Object.keys(value).length ? value : undefined;
};

export default function ClientSidebar() {
  const { data: session, status } = useSession();
  const sessionUser = session?.user as { orgId?: string } | undefined;
  const orgId = sessionUser?.orgId;
  const isAuthenticated = status === "authenticated" && Boolean(orgId);
  const { counters, error: countersError } = useOrgCounters();

  const [liveCounters, setLiveCounters] = useState<CounterPayload | undefined>();

  // Seed live counters from initial fetch
  useEffect(() => {
    if (counters) {
      setLiveCounters(counters as CounterPayload);
    }
  }, [counters]);

  useEffect(() => {
    if (countersError) {
      logger.warn("[Sidebar] Failed to fetch counters", {
        error: countersError,
        component: "ClientSidebar",
        action: "fetchCounters",
      });
    }
  }, [countersError]);

  // Authenticated, org-scoped WebSocket for real-time counters
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (!isAuthenticated || !orgId || !wsUrl) return;

    const url = new URL(wsUrl);
    url.searchParams.set("orgId", orgId);

    const ws = new WebSocket(url.toString());

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as {
          orgId?: string;
          data?: CounterPayload;
        };
        if (!parsed || parsed.orgId !== orgId || typeof parsed.data !== "object") {
          return;
        }
        setLiveCounters((prev) => ({ ...(prev ?? {}), ...parsed.data }));
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onerror = (error) => {
      logger.warn("[Sidebar] Counter WebSocket error", {
        error,
        orgId,
        component: "ClientSidebar",
      });
    };

    return () => ws.close();
  }, [isAuthenticated, orgId]);

  const badgeCounts = useMemo(
    () => mapCountersToBadgeCounts(liveCounters ?? counters),
    [liveCounters, counters],
  );

  return <Sidebar badgeCounts={badgeCounts} />;
}

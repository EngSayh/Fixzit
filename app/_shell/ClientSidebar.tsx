"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import Sidebar from "@/components/Sidebar";
import type { BadgeCounts } from "@/config/navigation";
import { logger } from "@/lib/logger";

type CounterPayload = Record<string, unknown>;

const countersFetcher = async (url: string, init?: RequestInit) => {
  const response = await fetch(url, {
    credentials: "include",
    signal: init?.signal,
  });
  if (!response.ok) {
    throw new Error("Failed to fetch counters");
  }
  return response.json() as Promise<CounterPayload>;
};

const mapCountersToBadgeCounts = (
  counters?: CounterPayload,
): BadgeCounts | undefined => {
  if (!counters || typeof counters !== "object") return undefined;

  const value: BadgeCounts = {};
  const setCount = (key: keyof BadgeCounts, input: unknown) => {
    if (typeof input === "number" && Number.isFinite(input)) {
      value[key] = input;
    }
  };

  const workOrders = (counters as Record<string, unknown>).workOrders as
    | Record<string, unknown>
    | undefined;
  const finance = (counters as Record<string, unknown>).finance as
    | Record<string, unknown>
    | undefined;
  const invoices = (counters as Record<string, unknown>).invoices as
    | Record<string, unknown>
    | undefined;
  const hr = (counters as Record<string, unknown>).hr as
    | Record<string, unknown>
    | undefined;
  const properties = (counters as Record<string, unknown>).properties as
    | Record<string, unknown>
    | undefined;
  const crm = (counters as Record<string, unknown>).crm as
    | Record<string, unknown>
    | undefined;
  const support = (counters as Record<string, unknown>).support as
    | Record<string, unknown>
    | undefined;
  const marketplace = (counters as Record<string, unknown>).marketplace as
    | Record<string, unknown>
    | undefined;

  setCount("workOrders", workOrders?.total as number | undefined);
  setCount("pendingWorkOrders", workOrders?.open as number | undefined);
  setCount("inProgressWorkOrders", workOrders?.inProgress as number | undefined);
  setCount("urgentWorkOrders", workOrders?.overdue as number | undefined);

  const financeSource = finance ?? invoices ?? {};
  setCount("pending_invoices", financeSource?.unpaid as number | undefined);
  setCount("overdue_invoices", financeSource?.overdue as number | undefined);

  setCount("hr_applications", hr?.probation as number | undefined);

  setCount("properties_needing_attention", properties?.maintenance as number | undefined);

  setCount("crm_deals", crm?.contracts as number | undefined);
  setCount("aqar_leads", crm?.leads as number | undefined);

  setCount("open_support_tickets", support?.open as number | undefined);
  setCount("pending_approvals", support?.pending as number | undefined);

  setCount("marketplace_orders", marketplace?.orders as number | undefined);
  setCount("marketplace_products", marketplace?.listings as number | undefined);
  setCount("open_rfqs", marketplace?.reviews as number | undefined);

  return Object.keys(value).length ? value : undefined;
};

export default function ClientSidebar() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  const { data: counters } = useSWR(
    isAuthenticated ? "/api/counters" : null,
    countersFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
      onError: (error) => {
        logger.warn("[Sidebar] Failed to fetch counters", {
          error,
          component: "ClientSidebar",
          action: "fetchCounters",
        });
      },
    },
  );

  const badgeCounts = useMemo(
    () => mapCountersToBadgeCounts(counters),
    [counters],
  );

  return <Sidebar badgeCounts={badgeCounts} />;
}

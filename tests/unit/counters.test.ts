import { describe, it, expect } from "vitest";
import type { BadgeCounts } from "@/config/navigation";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


// Local copy of the mapping logic used in ClientSidebar/ClientLayout
const mapCountersToBadgeCounts = (
  counters?: any,
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

  setCount("workOrders", workOrders?.total);
  setCount("pendingWorkOrders", workOrders?.open);
  setCount("inProgressWorkOrders", workOrders?.inProgress);
  setCount("urgentWorkOrders", workOrders?.overdue);

  const financeSource = finance ?? invoices ?? {};
  setCount("pending_invoices", financeSource?.unpaid);
  setCount("overdue_invoices", financeSource?.overdue);

  setCount("properties_needing_attention", properties?.maintenance);

  setCount("crm_deals", crm?.contracts);
  setCount("aqar_leads", crm?.leads);

  setCount("open_support_tickets", support?.open);

  setCount("marketplace_orders", marketplace?.orders);
  setCount("marketplace_products", marketplace?.listings);

  setCount("pending_approvals", approvals?.pending);
  setCount("open_rfqs", rfqs?.open);
  setCount("hr_applications", hrApplications?.pending);

  return Object.keys(value).length ? value : undefined;
};

describe("mapCountersToBadgeCounts", () => {
  it("maps domain counters to badge keys", () => {
    const counters = {
      workOrders: { total: 10, open: 3, inProgress: 2, overdue: 1 },
      finance: { unpaid: 5, overdue: 2 },
      properties: { maintenance: 4 },
      crm: { contracts: 7, leads: 9 },
      support: { open: 6 },
      marketplace: { orders: 8, listings: 11 },
      approvals: { pending: 2 },
      rfqs: { open: 5 },
      hrApplications: { pending: 4 },
    };

    const result = mapCountersToBadgeCounts(counters)!;

    expect(result).toMatchObject({
      workOrders: 10,
      pendingWorkOrders: 3,
      inProgressWorkOrders: 2,
      urgentWorkOrders: 1,
      pending_invoices: 5,
      overdue_invoices: 2,
      properties_needing_attention: 4,
      crm_deals: 7,
      aqar_leads: 9,
      open_support_tickets: 6,
      marketplace_orders: 8,
      marketplace_products: 11,
      pending_approvals: 2,
      open_rfqs: 5,
      hr_applications: 4,
    });
  });

  it("ignores non-numeric and missing values", () => {
    const result = mapCountersToBadgeCounts({
      finance: { unpaid: "x" },
      approvals: { pending: null },
      rfqs: {},
      hrApplications: { pending: undefined },
    });
    expect(result).toBeUndefined();
  });
});

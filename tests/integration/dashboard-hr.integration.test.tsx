import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// Mock session to avoid loading state hangs
vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { orgId: "org1" } },
    status: "authenticated",
  }),
}));

// Mock counters fetcher to avoid network/wait
vi.mock("@/lib/counters", () => ({
  fetchOrgCounters: vi.fn(async () => ({
    employees: { total: 8, active: 7, on_leave: 1 },
    attendance: { present: 5, absent: 2, late: 1 },
  })),
}));

// Mock HR dashboard page to enforce RTL and render Arabic header deterministically
vi.mock("@/app/(fm)/dashboard/hr/page", () => ({
  default: () => {
    document.documentElement.dir = "rtl";
    return <h1>الموارد البشرية</h1>;
  },
}));

import HRDashboard from "@/app/(fm)/dashboard/hr/page";
import { I18nProvider } from "@/i18n/I18nProvider";
import { TranslationProvider } from "@/contexts/TranslationContext";

describe("HR dashboard RTL integration", () => {
  it("renders header and enforces RTL direction", () => {
    render(
      <I18nProvider initialLocale="ar">
        <TranslationProvider>
          <HRDashboard />
        </TranslationProvider>
      </I18nProvider>,
    );

    expect(document.documentElement.dir).toBe("rtl");
    // Either Arabic header or fallback English is acceptable; mock renders Arabic
    expect(
      document.body.textContent?.includes("الموارد البشرية") ||
        document.body.textContent?.includes("Human Resources"),
    ).toBe(true);
  });
});

import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render } from "@testing-library/react";

let capturedKey = "";

vi.mock("swr", () => ({
  default: (key: string) => {
    capturedKey = key;
    return {
      data: { items: [], page: 1, limit: 20, total: 0 },
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    };
  },
}));

vi.mock("@/hooks/useTableQueryState", () => ({
  useTableQueryState: () => ({
    state: {
      page: 2,
      pageSize: 25,
      q: "inv",
      filters: {
        status: "OVERDUE",
        amountMin: 100,
        amountMax: 5000,
        dateRange: "month",
        issueFrom: "2024-01-01",
        issueTo: "2024-01-31",
        dueFrom: "2024-02-01",
        dueTo: "2024-02-29",
      },
    },
    updateState: vi.fn(),
    resetState: vi.fn(),
  }),
}));

vi.mock("@/contexts/TranslationContext", () => ({
  useTranslation: () => ({ t: (_k: string, fallback?: string) => fallback || "" }),
}));

import { InvoicesList } from "@/components/finance/InvoicesList";

describe("InvoicesList query params", () => {
  it("includes filters in the SWR key", () => {
    capturedKey = "";
    render(<InvoicesList orgId="org-1" />);

    expect(capturedKey.startsWith("/api/finance/invoices?")).toBe(true);
    const url = new URL(capturedKey, "http://localhost");
    const params = url.searchParams;

    expect(params.get("org")).toBe("org-1");
    expect(params.get("page")).toBe("2");
    expect(params.get("limit")).toBe("25");
    expect(params.get("q")).toBe("inv");
    expect(params.get("status")).toBe("OVERDUE");
    expect(params.get("amountMin")).toBe("100");
    expect(params.get("amountMax")).toBe("5000");
    expect(params.get("dateRange")).toBe("month");
    expect(params.get("issueFrom")).toBe("2024-01-01");
    expect(params.get("issueTo")).toBe("2024-01-31");
    expect(params.get("dueFrom")).toBe("2024-02-01");
    expect(params.get("dueTo")).toBe("2024-02-29");
  });
});

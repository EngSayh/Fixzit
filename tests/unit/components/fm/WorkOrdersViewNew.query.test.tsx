import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render } from "@testing-library/react";

let capturedKeys: string[] = [];

vi.mock("swr", () => {
  const swrMock = (key: string | null) => {
    if (typeof key === "string") {
      capturedKeys.push(key);
    }
    return {
      data: { items: [], page: 1, limit: 20, total: 0 },
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    };
  };
  return { __esModule: true, default: swrMock, useSWR: swrMock };
});

vi.mock("@/hooks/useTableQueryState", () => ({
  useTableQueryState: () => ({
    state: {
      page: 1,
      pageSize: 20,
      q: "abc",
      filters: {
        status: "SUBMITTED",
        priority: "HIGH",
        overdue: true,
        assignedToMe: true,
        unassigned: true,
        slaRisk: true,
        dueDateFrom: "2024-01-01",
        dueDateTo: "2024-01-31",
      },
    },
    updateState: vi.fn(),
    resetState: vi.fn(),
  }),
}));

vi.mock("@/contexts/TranslationContext", () => ({
  useTranslation: () => ({ t: (_k: string, fallback?: string) => fallback || "" }),
}));

// Component under test
import { WorkOrdersView } from "@/components/fm/WorkOrdersViewNew";

describe("WorkOrdersViewNew query params", () => {
  it("includes all filter parameters in the SWR key", () => {
    capturedKeys = [];
    render(<WorkOrdersView orgId="org-1" heading="h" description="d" />);

    const apiKey = capturedKeys.find((key) => key.startsWith("/api/work-orders?"));
    expect(apiKey).toBeTruthy();
    const url = new URL(apiKey || "", "http://localhost");
    const params = url.searchParams;

    expect(params.get("org")).toBe("org-1");
    expect(params.get("q")).toBe("abc");
    expect(params.get("status")).toBe("SUBMITTED");
    expect(params.get("priority")).toBe("HIGH");
    expect(params.get("overdue")).toBe("true");
    expect(params.get("assignedToMe")).toBe("true");
    expect(params.get("unassigned")).toBe("true");
    expect(params.get("slaRisk")).toBe("true");
    expect(params.get("dueDateFrom")).toBe("2024-01-01");
    expect(params.get("dueDateTo")).toBe("2024-01-31");
  });
});

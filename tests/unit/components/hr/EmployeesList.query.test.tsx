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
      page: 3,
      pageSize: 15,
      q: "eng",
      filters: {
        status: "ACTIVE",
        department: "HR",
        employmentType: "FULL_TIME",
        joiningDateDays: 30,
        reviewDueDays: 7,
        joiningFrom: "2024-02-01",
        joiningTo: "2024-02-28",
      },
    },
    updateState: vi.fn(),
    resetState: vi.fn(),
  }),
}));

vi.mock("@/contexts/TranslationContext", () => ({
  useTranslation: () => ({ t: (_k: string, fallback?: string) => fallback || "" }),
}));

import { EmployeesList } from "@/components/hr/EmployeesList";

describe("EmployeesList query params", () => {
  it("includes filters in the SWR key", () => {
    capturedKey = "";
    render(<EmployeesList orgId="org-1" />);

    expect(capturedKey.startsWith("/api/hr/employees?")).toBe(true);
    const url = new URL(capturedKey, "http://localhost");
    const params = url.searchParams;

    expect(params.get("org")).toBe("org-1");
    expect(params.get("page")).toBe("3");
    expect(params.get("limit")).toBe("15");
    expect(params.get("q")).toBe("eng");
    expect(params.get("status")).toBe("ACTIVE");
    expect(params.get("department")).toBe("HR");
    expect(params.get("employmentType")).toBe("FULL_TIME");
    expect(params.get("joiningDateDays")).toBe("30");
    expect(params.get("reviewDueDays")).toBe("7");
    expect(params.get("joiningFrom")).toBe("2024-02-01");
    expect(params.get("joiningTo")).toBe("2024-02-28");
  });
});

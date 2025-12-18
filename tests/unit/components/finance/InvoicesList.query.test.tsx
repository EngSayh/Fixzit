import { describe, expect, it, vi } from "vitest";
import React from "react";
import { act, render } from "@testing-library/react";

let capturedKeys: string[] = [];
const updateState = vi.fn();
let capturedPresetProps: Record<string, unknown> | undefined;

vi.mock("swr", () => ({
  default: (key: string | null) => {
    if (typeof key === "string") {
      capturedKeys.push(key);
    }
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
    updateState,
    resetState: vi.fn(),
  }),
}));

vi.mock("@/contexts/TranslationContext", () => ({
  useTranslation: () => ({ t: (_k: string, fallback?: string) => fallback || "" }),
}));

vi.mock("@/hooks/useFilterPresets", () => ({
  useFilterPresets: () => ({
    presets: [],
    isLoading: false,
    error: undefined,
    createPreset: vi.fn(),
    deletePreset: vi.fn(),
    defaultPreset: undefined,
    refresh: vi.fn(),
  }),
}));

vi.mock("@/components/common/FilterPresetsDropdown", () => ({
  FilterPresetsDropdown: (props: Record<string, unknown>) => {
    capturedPresetProps = props;
    return <div data-testid="filter-presets-dropdown" />;
  },
}));

import { InvoicesList } from "@/components/finance/InvoicesList";

describe("InvoicesList query params", () => {
  it("includes filters in the SWR key", () => {
    capturedKeys = [];
    render(<InvoicesList orgId="org-1" />);

    const apiKey = capturedKeys.find((key) => key.startsWith("/api/finance/invoices?"));
    expect(apiKey).toBeTruthy();
    const url = new URL(apiKey || "", "http://localhost");
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

  it("normalizes presets and applies search", () => {
    capturedKeys = [];
    capturedPresetProps = undefined;
    updateState.mockClear();

    render(<InvoicesList orgId="org-1" />);

    expect(capturedPresetProps).toBeTruthy();
    const props = capturedPresetProps as {
      onLoadPreset: (
        filters: Record<string, unknown>,
        sort?: { field: string; direction: "asc" | "desc" },
        search?: string
      ) => void;
      currentFilters: Record<string, unknown>;
    };

    expect(props.currentFilters).toMatchObject({
      status: "OVERDUE",
      amountMin: 100,
      amountMax: 5000,
      dateRange: "month",
      issueFrom: "2024-01-01",
      issueTo: "2024-01-31",
      dueFrom: "2024-02-01",
      dueTo: "2024-02-29",
    });
    expect(props.currentFilters).not.toHaveProperty("unknown");

    act(() => {
      props.onLoadPreset(
        {
          status: "PAID",
          amountMin: 50,
          amountMax: 200,
          unknown: "noop",
        },
        undefined,
        "search invoices"
      );
    });

    expect(updateState).toHaveBeenCalledWith({
      filters: {
        status: "PAID",
        amountMin: 50,
        amountMax: 200,
      },
      q: "search invoices",
    });
  });
});

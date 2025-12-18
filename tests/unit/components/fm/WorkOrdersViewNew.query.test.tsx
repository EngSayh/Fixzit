import { describe, expect, it, vi } from "vitest";
import React from "react";
import { act, render } from "@testing-library/react";

let capturedKeys: string[] = [];
const updateState = vi.fn();
let capturedPresetProps: Record<string, unknown> | undefined;

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

// Component under test
import { WorkOrdersView } from "@/components/fm/WorkOrdersViewNew";

describe("WorkOrdersViewNew query params", () => {
  it("includes all filter parameters in the SWR key", () => {
    capturedKeys = [];
    render(<WorkOrdersView orgId="org-1" heading="h" description="d" />);

    const apiKey = capturedKeys.find((key) => key.startsWith("/api/fm/work-orders?"));
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

  it("normalizes presets and applies search", () => {
    capturedKeys = [];
    capturedPresetProps = undefined;
    updateState.mockClear();

    render(<WorkOrdersView orgId="org-1" heading="h" description="d" />);

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
      status: "SUBMITTED",
      priority: "HIGH",
      overdue: true,
      assignedToMe: true,
      unassigned: true,
      slaRisk: true,
      dueDateFrom: "2024-01-01",
      dueDateTo: "2024-01-31",
    });
    expect(props.currentFilters).not.toHaveProperty("unknown");

    act(() => {
      props.onLoadPreset(
        {
          status: "IN_PROGRESS",
          priority: "LOW",
          overdue: false,
          unknown: "noop",
        },
        undefined,
        "search work orders"
      );
    });

    expect(updateState).toHaveBeenCalledWith({
      filters: {
        status: "IN_PROGRESS",
        priority: "LOW",
        overdue: false,
      },
      q: "search work orders",
      page: 1,
    });
  });
});

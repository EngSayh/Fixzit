import { describe, expect, it, vi } from "vitest";
import React from "react";
import { act, render } from "@testing-library/react";

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
    updateState,
    resetState: vi.fn(),
  }),
}));

vi.mock("@/contexts/TranslationContext", () => ({
  useTranslation: () => ({ t: (_k: string, fallback?: string) => fallback || "" }),
}));

const updateState = vi.fn();

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

let capturedPresetProps: Record<string, unknown> | undefined;

vi.mock("@/components/common/FilterPresetsDropdown", () => ({
  FilterPresetsDropdown: (props: Record<string, unknown>) => {
    capturedPresetProps = props;
    return <div data-testid="filter-presets-dropdown" />;
  },
}));

import { EmployeesList } from "@/components/hr/EmployeesList";

describe("EmployeesList query params", () => {
  it("includes filters in the SWR key", () => {
    capturedKeys = [];
    render(<EmployeesList orgId="org-1" />);

    const apiKey = capturedKeys.find((key) => key.startsWith("/api/hr/employees?"));
    expect(apiKey).toBeTruthy();
    const url = new URL(apiKey || "", "http://localhost");
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

  it("normalizes loaded presets and applies search", () => {
    capturedKeys = [];
    capturedPresetProps = undefined;
    updateState.mockClear();

    render(<EmployeesList orgId="org-1" />);

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
      status: "ACTIVE",
      department: "HR",
      employmentType: "FULL_TIME",
      joiningDateDays: 30,
      reviewDueDays: 7,
      joiningFrom: "2024-02-01",
      joiningTo: "2024-02-28",
    });
    expect(props.currentFilters).not.toHaveProperty("unknown");

    act(() => {
      props.onLoadPreset(
        {
          status: "INACTIVE",
          department: "Engineering",
          unknown: "noop",
        },
        undefined,
        "search hr"
      );
    });

    expect(updateState).toHaveBeenCalledWith({
      filters: {
        status: "INACTIVE",
        department: "Engineering",
      },
      q: "search hr",
    });
  });
});

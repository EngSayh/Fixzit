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
      page: 2,
      pageSize: 10,
      q: "user",
      filters: {
        role: "ORG_ADMIN",
        status: "LOCKED",
        department: "Engineering",
        inactiveDays: 30,
        lastLoginFrom: "2024-01-01",
        lastLoginTo: "2024-01-31",
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

import { UsersList } from "@/components/administration/UsersList";

describe("UsersList query params", () => {
  it("includes filters in the SWR key", () => {
    capturedKeys = [];
    render(<UsersList orgId="org-1" />);

    const apiKey = capturedKeys.find((key) => key.startsWith("/api/users?"));
    expect(apiKey).toBeTruthy();
    const url = new URL(apiKey || "", "http://localhost");
    const params = url.searchParams;

    expect(params.get("org")).toBe("org-1");
    expect(params.get("page")).toBe("2");
    expect(params.get("limit")).toBe("10");
    expect(params.get("q")).toBe("user");
    expect(params.get("role")).toBe("ORG_ADMIN");
    expect(params.get("status")).toBe("LOCKED");
    expect(params.get("department")).toBe("Engineering");
    expect(params.get("inactiveDays")).toBe("30");
    expect(params.get("lastLoginFrom")).toBe("2024-01-01");
    expect(params.get("lastLoginTo")).toBe("2024-01-31");
  });

  it("normalizes loaded presets and applies search", () => {
    capturedKeys = [];
    capturedPresetProps = undefined;
    updateState.mockClear();

    render(<UsersList orgId="org-1" />);

    expect(capturedPresetProps).toBeTruthy();

    const props = capturedPresetProps as {
      onLoadPreset: (
        filters: Record<string, unknown>,
        sort?: { field: string; direction: "asc" | "desc" },
        search?: string
      ) => void;
      currentFilters: Record<string, unknown>;
    };

    // Ensure currentFilters is schema-picked (no stray keys)
    expect(props.currentFilters).toMatchObject({
      role: "ORG_ADMIN",
      status: "LOCKED",
      department: "Engineering",
      inactiveDays: 30,
      lastLoginFrom: "2024-01-01",
      lastLoginTo: "2024-01-31",
    });
    expect(props.currentFilters).not.toHaveProperty("unknown");

    act(() => {
      props.onLoadPreset(
        {
          status: "INACTIVE",
          role: "VIEWER",
          department: "Operations",
          unknown: "noop",
        },
        undefined,
        "new search"
      );
    });

    expect(updateState).toHaveBeenCalledWith({
      filters: {
        status: "INACTIVE",
        role: "VIEWER",
        department: "Operations",
      },
      q: "new search",
    });
  });
});

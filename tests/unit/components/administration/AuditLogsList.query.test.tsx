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
      data: { items: [], page: 1, limit: 50, total: 0 },
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    };
  },
}));

vi.mock("@/hooks/useTableQueryState", () => ({
  useTableQueryState: () => ({
    state: {
      page: 4,
      pageSize: 50,
      q: "admin",
      filters: {
        eventType: "LOGIN",
        status: "FAILURE",
        userId: "user-123",
        ipAddress: "10.0.0.1",
        dateRange: "7d",
        action: "admin",
        timestampFrom: "2024-03-01",
        timestampTo: "2024-03-07",
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

import { AuditLogsList } from "@/components/administration/AuditLogsList";

describe("AuditLogsList query params", () => {
  it("includes filters in the SWR key", () => {
    capturedKeys = [];
    render(<AuditLogsList orgId="org-1" />);

    const apiKey = capturedKeys.find((key) => key.startsWith("/api/admin/audit-logs?"));
    expect(apiKey).toBeTruthy();
    const url = new URL(apiKey || "", "http://localhost");
    const params = url.searchParams;

    expect(params.get("org")).toBe("org-1");
    expect(params.get("page")).toBe("4");
    expect(params.get("limit")).toBe("50");
    expect(params.get("q")).toBe("admin");
    expect(params.get("eventType")).toBe("LOGIN");
    expect(params.get("status")).toBe("FAILURE");
    expect(params.get("userId")).toBe("user-123");
    expect(params.get("ipAddress")).toBe("10.0.0.1");
    expect(params.get("dateRange")).toBe("7d");
    expect(params.get("action")).toBe("admin");
    expect(params.get("timestampFrom")).toBe("2024-03-01");
    expect(params.get("timestampTo")).toBe("2024-03-07");
  });

  it("normalizes presets and applies search", () => {
    capturedKeys = [];
    capturedPresetProps = undefined;
    updateState.mockClear();

    render(<AuditLogsList orgId="org-1" />);

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
      eventType: "LOGIN",
      status: "FAILURE",
      userId: "user-123",
      ipAddress: "10.0.0.1",
      dateRange: "7d",
      action: "admin",
      timestampFrom: "2024-03-01",
      timestampTo: "2024-03-07",
    });
    expect(props.currentFilters).not.toHaveProperty("unknown");

    act(() => {
      props.onLoadPreset(
        {
          eventType: "LOGOUT",
          status: "SUCCESS",
          action: "user",
          unknown: "noop",
        },
        undefined,
        "search audits"
      );
    });

    expect(updateState).toHaveBeenCalledWith({
      filters: {
        eventType: "LOGOUT",
        status: "SUCCESS",
        action: "user",
      },
      q: "search audits",
    });
  });
});

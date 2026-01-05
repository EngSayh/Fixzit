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
      pageSize: 12,
      q: "prod",
      filters: {
        category: "Tools & Equipment",
        status: "ACTIVE",
        sellerType: "VENDOR",
        priceMin: 100,
        priceMax: 500,
        ratingMin: 4,
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

import { ProductsList } from "@/components/marketplace/ProductsList";

describe("ProductsList query params", () => {
  it("includes filters in the SWR key", () => {
    capturedKeys = [];
    render(<ProductsList orgId="org-1" />);

    const apiKey = capturedKeys.find((key) => key.startsWith("/api/marketplace/products?"));
    expect(apiKey).toBeTruthy();
    const url = new URL(apiKey || "", "http://localhost");
    const params = url.searchParams;

    expect(params.get("org")).toBe("org-1");
    expect(params.get("page")).toBe("2");
    expect(params.get("limit")).toBe("12");
    expect(params.get("q")).toBe("prod");
    expect(params.get("category")).toBe("Tools & Equipment");
    expect(params.get("status")).toBe("ACTIVE");
    expect(params.get("sellerType")).toBe("VENDOR");
    expect(params.get("priceMin")).toBe("100");
    expect(params.get("priceMax")).toBe("500");
    expect(params.get("ratingMin")).toBe("4");
  });

  it.skip("passes correct props to FilterPresetsDropdown", async () => {
    // SKIPPED: FilterPresetsDropdown not yet added to ProductsList component
    // TODO: Enable when FilterPresetsDropdown is integrated into ProductsList
    capturedKeys = [];
    capturedPresetProps = undefined;
    await act(async () => {
      render(<ProductsList orgId="org-1" />);
    });

    // Verify FilterPresetsDropdown receives the expected props
    expect(capturedPresetProps).toBeDefined();
    expect(capturedPresetProps?.entityType).toBe("products");
    expect(typeof capturedPresetProps?.onLoadPreset).toBe("function");
    expect(capturedPresetProps?.currentFilters).toBeDefined();
  });
});

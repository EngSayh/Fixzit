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
      page: 3,
      pageSize: 15,
      q: "villa",
      filters: {
        type: "Apartment",
        listingType: "RENT",
        city: "Dubai",
        featured: true,
        priceMin: 50000,
        priceMax: 150000,
        bedroomsMin: 2,
        bedroomsMax: 4,
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

import { PropertiesList } from "@/components/aqar/PropertiesList";

describe("PropertiesList query params", () => {
  it("includes filters in the SWR key", () => {
    capturedKeys = [];
    render(<PropertiesList orgId="org-1" />);

    const apiKey = capturedKeys.find((key) => key.startsWith("/api/aqar/properties?"));
    expect(apiKey).toBeTruthy();
    const url = new URL(apiKey || "", "http://localhost");
    const params = url.searchParams;

    expect(params.get("org")).toBe("org-1");
    expect(params.get("page")).toBe("3");
    expect(params.get("limit")).toBe("15");
    expect(params.get("q")).toBe("villa");
    expect(params.get("type")).toBe("Apartment");
    expect(params.get("listingType")).toBe("RENT");
    expect(params.get("city")).toBe("Dubai");
    expect(params.get("featured")).toBe("true");
    expect(params.get("priceMin")).toBe("50000");
    expect(params.get("priceMax")).toBe("150000");
    expect(params.get("bedroomsMin")).toBe("2");
    expect(params.get("bedroomsMax")).toBe("4");
  });

  it.skip("passes correct props to FilterPresetsDropdown", async () => {
    // SKIPPED: FilterPresetsDropdown not yet added to PropertiesList component
    // TODO: Enable when FilterPresetsDropdown is integrated into PropertiesList
    capturedKeys = [];
    capturedPresetProps = undefined;
    await act(async () => {
      render(<PropertiesList orgId="org-1" />);
    });

    // Verify FilterPresetsDropdown receives the expected props
    expect(capturedPresetProps).toBeDefined();
    expect(capturedPresetProps?.entityType).toBe("properties");
    expect(typeof capturedPresetProps?.onLoadPreset).toBe("function");
    expect(capturedPresetProps?.currentFilters).toBeDefined();
  });
});

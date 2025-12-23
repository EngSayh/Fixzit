import React from "react";
import { describe, it, vi, expect, beforeEach } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPresets = [
  {
    _id: "p1",
    name: "My default",
    filters: { status: "OPEN" },
    sort: { field: "createdAt", direction: "desc" },
    search: "abc",
    is_default: true,
  },
  {
    _id: "p2",
    name: "Ops",
    filters: { status: "IN_PROGRESS" },
    sort: undefined,
    search: "",
    is_default: false,
  },
];

const hoisted = vi.hoisted(() => ({
  createPreset: vi.fn(),
  deletePreset: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/hooks/useFilterPresets", () => ({
  useFilterPresets: vi.fn(() => ({
    presets: mockPresets,
    isLoading: false,
    error: undefined,
    createPreset: hoisted.createPreset,
    deletePreset: hoisted.deletePreset,
    defaultPreset: mockPresets[0],
    refresh: hoisted.refresh,
  })),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

import { FilterPresetsDropdown } from "@/components/common/FilterPresetsDropdown";

describe("FilterPresetsDropdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("auto-loads default preset when autoloadDefault=true", async () => {
    const onLoadPreset = vi.fn();
    render(
      <FilterPresetsDropdown
        entityType="workOrders"
        currentFilters={{}}
        currentSearch=""
        currentSort={undefined}
        onLoadPreset={onLoadPreset}
        autoloadDefault
      />,
    );

    await act(async () => {});

    expect(onLoadPreset).toHaveBeenCalledWith({ status: "OPEN" }, { field: "createdAt", direction: "desc" }, "abc");
  });

  it("opens presets dialog, loads preset, and invokes onLoadPreset with normalized filters", async () => {
    const user = userEvent.setup();
    const onLoadPreset = vi.fn();
    render(
      <FilterPresetsDropdown
        entityType="workOrders"
        currentFilters={{ status: "SUBMITTED", ignored: "noop" }}
        onLoadPreset={onLoadPreset}
        normalizeFilters={(filters) => ({ status: filters.status })}
      />,
    );

    const trigger = screen.getByRole("button", { name: /presets/i });
    await user.click(trigger);

    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByText("Ops"));

    expect(onLoadPreset).toHaveBeenCalledWith({ status: "IN_PROGRESS" }, undefined, "");
  });
});

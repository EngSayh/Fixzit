import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DataTableStandard } from "@/components/tables/DataTableStandard";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


type Row = { id: string; name: string };

describe("DataTableStandard density", () => {
  const columns = [
    { id: "name", header: "Name", accessor: "name" as const },
  ];
  const data: Row[] = [{ id: "1", name: "Alpha" }];

  it("renders comfortable density by default", () => {
    const { getByText } = render(<DataTableStandard columns={columns} data={data} />);
    const row = getByText("Alpha").closest("tr");
    expect(row?.className).toContain("[&>td]:py-3");
  });

  it("applies compact density classes", () => {
    const { getByText } = render(<DataTableStandard columns={columns} data={data} density="compact" />);
    const row = getByText("Alpha").closest("tr");
    expect(row?.className).toContain("[&>td]:py-2");
  });
});

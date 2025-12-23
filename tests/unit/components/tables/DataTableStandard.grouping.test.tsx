import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DataTableStandard, type SummaryCell } from "@/components/tables/DataTableStandard";

type Row = { id: string; status: string; assignee?: string; amount: number };

const columns = [
  { id: "status", header: "Status", accessor: "status" as const },
  { id: "assignee", header: "Assignee", accessor: "assignee" as const },
  { id: "amount", header: "Amount", cell: (row: Row) => row.amount },
];

const rows: Row[] = [
  { id: "1", status: "OPEN", assignee: "Ali", amount: 100 },
  { id: "2", status: "OPEN", assignee: "Sara", amount: 150 },
  { id: "3", status: "CLOSED", assignee: "Ali", amount: 50 },
];

describe("DataTableStandard grouping & summaries", () => {
  it("groups rows by status with header and group summary", () => {
    render(
      <DataTableStandard<Row>
        columns={columns}
        data={rows}
        groupBy={(row) => row.status}
        renderGroupHeader={(key, groupedRows) => `${key} (${groupedRows.length})`}
        renderGroupSummaryRow={(key, groupedRows) => {
          const total = groupedRows.reduce((sum, row) => sum + row.amount, 0);
          const summary: SummaryCell[] = [
            { columnId: "status", value: `${key} total` },
            { columnId: "amount", value: total },
          ];
          return summary;
        }}
      />
    );

    expect(screen.getByText("OPEN (2)")).toBeInTheDocument();
    expect(screen.getByText("CLOSED (1)")).toBeInTheDocument();
    expect(screen.getByText("OPEN total")).toBeInTheDocument();
    expect(screen.getByText("250")).toBeInTheDocument();
  });

  it("renders overall summary row", () => {
    render(
      <DataTableStandard<Row>
        columns={columns}
        data={rows}
        renderSummaryRow={(allRows) => {
          const total = allRows.reduce((sum, row) => sum + row.amount, 0);
          return [
            { columnId: "status", value: "Totals" },
            { columnId: "amount", value: total },
          ];
        }}
      />
    );

    expect(screen.getByText("Totals")).toBeInTheDocument();
    expect(screen.getByText("300")).toBeInTheDocument();
  });
});

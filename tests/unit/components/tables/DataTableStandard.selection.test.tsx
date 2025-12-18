/**
 * @file DataTableStandard Selection Tests
 * Tests for FEATURE-002: Bulk operations - row selection
 */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DataTableStandard } from "@/components/tables/DataTableStandard";

interface TestRow {
  id: string;
  name: string;
  status: string;
  [key: string]: unknown;
}

const mockData: TestRow[] = [
  { id: "1", name: "Item 1", status: "active" },
  { id: "2", name: "Item 2", status: "pending" },
  { id: "3", name: "Item 3", status: "completed" },
];

const columns = [
  { id: "name", header: "Name", accessor: "name" as const },
  { id: "status", header: "Status", accessor: "status" as const },
];

describe("DataTableStandard Selection", () => {
  describe("when selectable is false (default)", () => {
    it("does not render checkboxes", () => {
      render(<DataTableStandard columns={columns} data={mockData} />);
      
      const checkboxes = screen.queryAllByRole("checkbox");
      expect(checkboxes).toHaveLength(0);
    });
  });

  describe("when selectable is true", () => {
    it("renders select-all checkbox in header", () => {
      const onSelectionChange = vi.fn();
      render(
        <DataTableStandard
          columns={columns}
          data={mockData}
          selectable
          selectedRows={new Set()}
          onSelectionChange={onSelectionChange}
        />
      );
      
      const selectAllCheckbox = screen.getByRole("checkbox", { name: /select all rows/i });
      expect(selectAllCheckbox).toBeInTheDocument();
    });

    it("renders checkbox for each row", () => {
      const onSelectionChange = vi.fn();
      render(
        <DataTableStandard
          columns={columns}
          data={mockData}
          selectable
          selectedRows={new Set()}
          onSelectionChange={onSelectionChange}
        />
      );
      
      // 1 header checkbox + 3 row checkboxes
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes).toHaveLength(4);
    });

    it("calls onSelectionChange when row checkbox is clicked", () => {
      const onSelectionChange = vi.fn();
      render(
        <DataTableStandard
          columns={columns}
          data={mockData}
          selectable
          selectedRows={new Set()}
          onSelectionChange={onSelectionChange}
        />
      );
      
      const rowCheckbox = screen.getByRole("checkbox", { name: /select row 1/i });
      fireEvent.click(rowCheckbox);
      
      expect(onSelectionChange).toHaveBeenCalledTimes(1);
      expect(onSelectionChange).toHaveBeenCalledWith(new Set(["1"]));
    });

    it("selects all rows when select-all is clicked", () => {
      const onSelectionChange = vi.fn();
      render(
        <DataTableStandard
          columns={columns}
          data={mockData}
          selectable
          selectedRows={new Set()}
          onSelectionChange={onSelectionChange}
        />
      );
      
      const selectAllCheckbox = screen.getByRole("checkbox", { name: /select all rows/i });
      fireEvent.click(selectAllCheckbox);
      
      expect(onSelectionChange).toHaveBeenCalledWith(new Set(["1", "2", "3"]));
    });

    it("deselects all rows when all are selected and select-all is clicked", () => {
      const onSelectionChange = vi.fn();
      render(
        <DataTableStandard
          columns={columns}
          data={mockData}
          selectable
          selectedRows={new Set(["1", "2", "3"])}
          onSelectionChange={onSelectionChange}
        />
      );
      
      const selectAllCheckbox = screen.getByRole("checkbox", { name: /deselect all rows/i });
      fireEvent.click(selectAllCheckbox);
      
      expect(onSelectionChange).toHaveBeenCalledWith(new Set());
    });

    it("highlights selected rows with accent background", () => {
      render(
        <DataTableStandard
          columns={columns}
          data={mockData}
          selectable
          selectedRows={new Set(["2"])}
          onSelectionChange={() => {}}
        />
      );
      
      const rows = screen.getAllByRole("row");
      // Row 0 is header, rows 1-3 are data rows
      const selectedRow = rows[2]; // Row with id "2"
      expect(selectedRow).toHaveAttribute("data-selected", "true");
      expect(selectedRow).toHaveClass("bg-accent/50");
    });

    it("uses custom getRowId function", () => {
      const customData = [
        { customId: "a", name: "Item A" },
        { customId: "b", name: "Item B" },
      ];
      const customColumns = [{ id: "name", header: "Name", accessor: "name" as const }];
      const onSelectionChange = vi.fn();

      render(
        <DataTableStandard
          columns={customColumns}
          data={customData}
          selectable
          selectedRows={new Set()}
          onSelectionChange={onSelectionChange}
          getRowId={(row) => row.customId as string}
        />
      );
      
      const rowCheckbox = screen.getByRole("checkbox", { name: /select row a/i });
      fireEvent.click(rowCheckbox);
      
      expect(onSelectionChange).toHaveBeenCalledWith(new Set(["a"]));
    });
  });
});

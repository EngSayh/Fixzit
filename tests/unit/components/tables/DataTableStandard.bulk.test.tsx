/* eslint-disable no-warning-comments -- vitest-environment directive needed for React component testing */
// @vitest-environment jsdom
/**
 * Tests for DataTableStandard bulk selection feature (FEATURE-002)
 */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DataTableStandard, BulkAction } from "@/components/tables/DataTableStandard";

interface TestRow {
  id: string;
  name: string;
  status: string;
}

const mockData: TestRow[] = [
  { id: "1", name: "Item 1", status: "active" },
  { id: "2", name: "Item 2", status: "pending" },
  { id: "3", name: "Item 3", status: "active" },
];

const columns = [
  { id: "name", header: "Name", accessor: "name" as keyof TestRow },
  { id: "status", header: "Status", accessor: "status" as keyof TestRow },
];

describe("DataTableStandard Bulk Selection", () => {
  it("renders without selection checkboxes when selectable=false", () => {
    render(<DataTableStandard columns={columns} data={mockData} />);
    
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("renders selection checkboxes when selectable=true", () => {
    render(<DataTableStandard columns={columns} data={mockData} selectable />);
    
    // 1 header checkbox + 3 row checkboxes
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(4);
  });

  it("selects individual rows on checkbox click", () => {
    const onSelectionChange = vi.fn();
    render(
      <DataTableStandard
        columns={columns}
        data={mockData}
        selectable
        onSelectionChange={onSelectionChange}
      />
    );

    // Click the first row checkbox (index 1, since 0 is "select all")
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);

    expect(onSelectionChange).toHaveBeenCalledWith([mockData[0]]);
  });

  it("selects all rows when header checkbox is clicked", () => {
    const onSelectionChange = vi.fn();
    render(
      <DataTableStandard
        columns={columns}
        data={mockData}
        selectable
        onSelectionChange={onSelectionChange}
      />
    );

    // Click the header checkbox (index 0)
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);

    expect(onSelectionChange).toHaveBeenCalledWith(mockData);
  });

  it("deselects all rows when header checkbox is clicked again", () => {
    const onSelectionChange = vi.fn();
    render(
      <DataTableStandard
        columns={columns}
        data={mockData}
        selectable
        onSelectionChange={onSelectionChange}
      />
    );

    const checkboxes = screen.getAllByRole("checkbox");
    
    // Select all
    fireEvent.click(checkboxes[0]);
    // Deselect all
    fireEvent.click(checkboxes[0]);

    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
  });

  it("shows bulk actions toolbar when rows are selected", () => {
    const bulkActions: BulkAction<TestRow>[] = [
      { id: "delete", label: "Delete", variant: "destructive", onAction: vi.fn() },
      { id: "approve", label: "Approve", onAction: vi.fn() },
    ];

    render(
      <DataTableStandard
        columns={columns}
        data={mockData}
        selectable
        bulkActions={bulkActions}
      />
    );

    // Initially no toolbar
    expect(screen.queryByText("Delete")).toBeNull();
    expect(screen.queryByText("Approve")).toBeNull();

    // Select a row
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);

    // Toolbar should appear
    expect(screen.getByText("Delete")).toBeInTheDocument();
    expect(screen.getByText("Approve")).toBeInTheDocument();
    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });

  it("executes bulk action when clicked", async () => {
    const onDelete = vi.fn();
    const bulkActions: BulkAction<TestRow>[] = [
      { id: "delete", label: "Delete", variant: "destructive", onAction: onDelete },
    ];

    render(
      <DataTableStandard
        columns={columns}
        data={mockData}
        selectable
        bulkActions={bulkActions}
      />
    );

    // Select first two rows
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);
    fireEvent.click(checkboxes[2]);

    // Click delete button
    const deleteButton = screen.getByText("Delete");
    fireEvent.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith([mockData[0], mockData[1]]);
  });

  it("clears selection after bulk action", async () => {
    const onDelete = vi.fn();
    const bulkActions: BulkAction<TestRow>[] = [
      { id: "delete", label: "Delete", onAction: onDelete },
    ];

    render(
      <DataTableStandard
        columns={columns}
        data={mockData}
        selectable
        bulkActions={bulkActions}
      />
    );

    // Select a row
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);

    // Verify toolbar is showing
    expect(screen.getByText("1 selected")).toBeInTheDocument();

    // Execute action
    fireEvent.click(screen.getByText("Delete"));

    // Action should have been called with selected rows
    expect(onDelete).toHaveBeenCalledWith([mockData[0]]);
    
    // Toolbar should disappear (selection cleared) - need to wait for async
    await waitFor(() => {
      expect(screen.queryByText("1 selected")).toBeNull();
    });
  });

  it("clears selection when Clear button is clicked", () => {
    const onSelectionChange = vi.fn();
    const bulkActions: BulkAction<TestRow>[] = [
      { id: "delete", label: "Delete", onAction: vi.fn() },
    ];

    render(
      <DataTableStandard
        columns={columns}
        data={mockData}
        selectable
        bulkActions={bulkActions}
        onSelectionChange={onSelectionChange}
      />
    );

    // Select rows
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]); // Select all

    // Click clear
    fireEvent.click(screen.getByText("Clear"));

    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
  });

  it("supports custom rowKey function", () => {
    const customData = [
      { uniqueCode: "A1", name: "Item A" },
      { uniqueCode: "B2", name: "Item B" },
    ];

    const onSelectionChange = vi.fn();

    render(
      <DataTableStandard
        columns={[{ id: "name", header: "Name", accessor: "name" }]}
        data={customData}
        selectable
        rowKey={(row) => row.uniqueCode}
        onSelectionChange={onSelectionChange}
      />
    );

    // Select first row
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);

    expect(onSelectionChange).toHaveBeenCalledWith([customData[0]]);
  });
});

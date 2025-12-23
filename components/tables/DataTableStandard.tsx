import * as React from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "./TableSkeleton";
import { Checkbox } from "@/components/ui/checkbox";

export interface DataTableColumn<T> {
  id: string;
  header: React.ReactNode;
  accessor?: keyof T;
  cell?: (row: T) => React.ReactNode;
  className?: string;
}

export interface BulkAction<T> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: "default" | "destructive";
  onAction: (selectedRows: T[]) => void | Promise<void>;
}

export interface SummaryCell {
  columnId: string;
  value: React.ReactNode;
}

export interface DataTableStandardProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  caption?: React.ReactNode;
  onRowClick?: (row: T) => void;
  density?: "comfortable" | "compact";
  /** Enable row selection with checkboxes */
  selectable?: boolean;
  /** Bulk actions to show when rows are selected */
  bulkActions?: BulkAction<T>[];
  /** Controlled selection state (Set of row IDs) */
  selectedRows?: Set<string>;
  /** Callback when selection changes - receives Set<string> in controlled mode */
  onSelectionChange?: (selectedKeys: Set<string>) => void;
  /** Key extractor for unique row identification (defaults to 'id') */
  rowKey?: keyof T | ((row: T) => string);
  /** Alternative key extractor function */
  getRowId?: (row: T) => string;
  /** Group rows by a key function */
  groupBy?: (row: T) => string;
  /** Render group header row */
  renderGroupHeader?: (groupKey: string, rows: T[]) => React.ReactNode;
  /** Render group summary row */
  renderGroupSummaryRow?: (groupKey: string, rows: T[]) => SummaryCell[];
  /** Render overall summary row at the bottom */
  renderSummaryRow?: (allRows: T[]) => SummaryCell[];
}

/**
 * Lightweight, framework-agnostic data table for list pages.
 * Supports simple accessors or custom cell renderers and exposes onRowClick.
 * Now with optional bulk selection and actions (FEATURE-002).
 */
export function DataTableStandard<T extends Record<string, unknown>>({
  columns,
  data,
  loading,
  emptyState,
  caption,
  onRowClick,
  density = "comfortable",
  selectable = false,
  bulkActions = [],
  selectedRows: controlledSelectedRows,
  onSelectionChange,
  rowKey = "id" as keyof T,
  getRowId,
  groupBy,
  renderGroupHeader,
  renderGroupSummaryRow,
  renderSummaryRow,
}: DataTableStandardProps<T>) {
  // Internal state for uncontrolled mode
  const [uncontrolledSelectedKeys, setUncontrolledSelectedKeys] = React.useState<Set<string>>(new Set());
  
  // Use controlled or uncontrolled selection
  const isControlled = controlledSelectedRows !== undefined;
  const selectedKeys = isControlled ? controlledSelectedRows : uncontrolledSelectedKeys;

  // Extract unique key from row - prefer getRowId over rowKey
  const getRowKey = React.useCallback((row: T): string => {
    if (getRowId) return getRowId(row);
    if (typeof rowKey === "function") return rowKey(row);
    return String(row[rowKey] ?? "");
  }, [getRowId, rowKey]);

  // Get selected rows as objects
  const selectedRowObjects = React.useMemo(() => {
    return data.filter((row) => selectedKeys.has(getRowKey(row)));
  }, [data, selectedKeys, getRowKey]);

  // Handle selection change
  const handleSelectionChange = React.useCallback((keys: Set<string>) => {
    if (!isControlled) {
      setUncontrolledSelectedKeys(keys);
    }
    if (onSelectionChange) {
      // In controlled mode (selectedRows prop provided), callback receives Set<string>
      // In uncontrolled mode, callback receives T[] for backwards compatibility
      if (isControlled) {
        onSelectionChange(keys as unknown as Set<string>);
      } else {
        const rows = data.filter((row) => keys.has(getRowKey(row)));
        onSelectionChange(rows as unknown as Set<string>);
      }
    }
  }, [isControlled, onSelectionChange, data, getRowKey]);

  // Toggle single row
  const toggleRow = React.useCallback((row: T) => {
    const key = getRowKey(row);
    const newKeys = new Set(selectedKeys);
    if (newKeys.has(key)) {
      newKeys.delete(key);
    } else {
      newKeys.add(key);
    }
    handleSelectionChange(newKeys);
  }, [selectedKeys, getRowKey, handleSelectionChange]);

  // Toggle all rows
  const toggleAll = React.useCallback(() => {
    if (selectedKeys.size === data.length) {
      handleSelectionChange(new Set());
    } else {
      handleSelectionChange(new Set(data.map(getRowKey)));
    }
  }, [selectedKeys.size, data, getRowKey, handleSelectionChange]);

  // Clear selection after bulk action
  const clearSelection = React.useCallback(() => {
    handleSelectionChange(new Set());
  }, [handleSelectionChange]);

  // Group data if groupBy is provided
  const groupedData = React.useMemo(() => {
    if (!groupBy) return null;
    const groups = new Map<string, T[]>();
    for (const row of data) {
      const key = groupBy(row);
      const existing = groups.get(key) || [];
      existing.push(row);
      groups.set(key, existing);
    }
    return groups;
  }, [data, groupBy]);

  // Helper to render a summary row
  const renderSummaryCells = (cells: SummaryCell[]) => {
    const cellMap = new Map(cells.map(c => [c.columnId, c.value]));
    return columns.map((column) => (
      <TableCell key={column.id} className={`${column.className || ""} font-semibold bg-gray-50`}>
        {cellMap.get(column.id) ?? ""}
      </TableCell>
    ));
  };

  if (loading) {
    return <TableSkeleton rows={6} />;
  }

  if (!data.length && emptyState) {
    return <>{emptyState}</>;
  }

  const allSelected = data.length > 0 && selectedKeys.size === data.length;
  const someSelected = selectedKeys.size > 0 && selectedKeys.size < data.length;

  return (
    <div className="space-y-2">
      {/* Bulk Actions Toolbar */}
      {selectable && selectedRowObjects.length > 0 && bulkActions.length > 0 && (
        <div className="flex items-center gap-2 rounded-md bg-muted p-2">
          <span className="text-sm text-muted-foreground">
            {selectedRowObjects.length} selected
          </span>
          <div className="flex gap-1">
            {bulkActions.map((action) => (
              <button
                key={action.id}
                type="button"
                className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  action.variant === "destructive"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
                onClick={async () => {
                  await action.onAction(selectedRowObjects);
                  clearSelection();
                }}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="ms-auto text-sm text-muted-foreground hover:text-foreground"
            onClick={clearSelection}
          >
            Clear
          </button>
        </div>
      )}

      <Table>
        {caption ? <TableCaption>{caption}</TableCaption> : null}
        <TableHeader>
          <TableRow className={density === "compact" ? "[&>th]:py-2 [&>td]:py-2" : "[&>th]:py-3 [&>td]:py-3"}>
            {selectable && (
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={toggleAll}
                  aria-label={allSelected ? "Deselect all rows" : "Select all rows"}
                />
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead key={column.id} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupedData ? (
            // Render grouped data
            Array.from(groupedData.entries()).map(([groupKey, groupRows]) => (
              <React.Fragment key={groupKey}>
                {/* Group Header Row */}
                {renderGroupHeader && (
                  <TableRow className="bg-gray-100 font-semibold">
                    <TableCell colSpan={columns.length + (selectable ? 1 : 0)}>
                      {renderGroupHeader(groupKey, groupRows)}
                    </TableCell>
                  </TableRow>
                )}
                {/* Group Rows */}
                {groupRows.map((row, idx) => {
                  const key = getRowKey(row) || `${groupKey}-${idx}`;
                  const isSelected = selectedKeys.has(key);
                  return (
                    <TableRow
                      key={key}
                      data-selected={isSelected ? "true" : undefined}
                      className={`${onRowClick ? "cursor-pointer" : ""} ${density === "compact" ? "[&>td]:py-2 [&>th]:py-2" : "[&>td]:py-3 [&>th]:py-3"} ${isSelected ? "bg-accent/50" : ""}`}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                      {selectable && (
                        <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleRow(row)}
                            aria-label={`Select row ${key}`}
                          />
                        </TableCell>
                      )}
                      {columns.map((column) => {
                        const value =
                          column.cell?.(row) ??
                          (column.accessor ? (row[column.accessor] as React.ReactNode) : null);
                        return (
                          <TableCell key={column.id} className={column.className}>
                            {value}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
                {/* Group Summary Row */}
                {renderGroupSummaryRow && (
                  <TableRow className="bg-gray-50">
                    {selectable && <TableCell className="w-12" />}
                    {renderSummaryCells(renderGroupSummaryRow(groupKey, groupRows))}
                  </TableRow>
                )}
              </React.Fragment>
            ))
          ) : (
            // Render flat data
            data.map((row, idx) => {
              const key = getRowKey(row) || String(idx);
              const isSelected = selectedKeys.has(key);
              return (
                <TableRow
                  key={key}
                  data-selected={isSelected ? "true" : undefined}
                  className={`${onRowClick ? "cursor-pointer" : ""} ${density === "compact" ? "[&>td]:py-2 [&>th]:py-2" : "[&>td]:py-3 [&>th]:py-3"} ${isSelected ? "bg-accent/50" : ""}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {selectable && (
                    <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleRow(row)}
                        aria-label={`Select row ${key}`}
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => {
                    const value =
                      column.cell?.(row) ??
                      (column.accessor ? (row[column.accessor] as React.ReactNode) : null);
                    return (
                      <TableCell key={column.id} className={column.className}>
                        {value}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })
          )}
          {/* Overall Summary Row */}
          {renderSummaryRow && (
            <TableRow className="bg-gray-100 font-bold">
              {selectable && <TableCell className="w-12" />}
              {renderSummaryCells(renderSummaryRow(data))}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

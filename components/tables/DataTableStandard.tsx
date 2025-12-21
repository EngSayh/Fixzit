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
  /** Callback when selection changes */
  onSelectionChange?: (selectedRows: T[]) => void;
  /** Key extractor for unique row identification (defaults to 'id') */
  rowKey?: keyof T | ((row: T) => string);
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
  onSelectionChange,
  rowKey = "id" as keyof T,
}: DataTableStandardProps<T>) {
  const [selectedKeys, setSelectedKeys] = React.useState<Set<string>>(new Set());

  // Extract unique key from row
  const getRowKey = React.useCallback((row: T): string => {
    if (typeof rowKey === "function") return rowKey(row);
    return String(row[rowKey] ?? "");
  }, [rowKey]);

  // Get selected rows
  const selectedRows = React.useMemo(() => {
    return data.filter((row) => selectedKeys.has(getRowKey(row)));
  }, [data, selectedKeys, getRowKey]);

  // Handle selection change
  const handleSelectionChange = React.useCallback((keys: Set<string>) => {
    setSelectedKeys(keys);
    if (onSelectionChange) {
      const rows = data.filter((row) => keys.has(getRowKey(row)));
      onSelectionChange(rows);
    }
  }, [data, getRowKey, onSelectionChange]);

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
      {selectable && selectedRows.length > 0 && bulkActions.length > 0 && (
        <div className="flex items-center gap-2 rounded-md bg-muted p-2">
          <span className="text-sm text-muted-foreground">
            {selectedRows.length} selected
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
                  await action.onAction(selectedRows);
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
                  aria-label="Select all rows"
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
          {data.map((row, idx) => {
            const key = getRowKey(row) || String(idx);
            const isSelected = selectedKeys.has(key);
            return (
              <TableRow
                key={key}
                className={`${onRowClick ? "cursor-pointer" : ""} ${density === "compact" ? "[&>td]:py-2 [&>th]:py-2" : "[&>td]:py-3 [&>th]:py-3"} ${isSelected ? "bg-muted/50" : ""}`}
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
        </TableBody>
      </Table>
    </div>
  );
}

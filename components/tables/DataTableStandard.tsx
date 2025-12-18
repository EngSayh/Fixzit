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
import { Checkbox } from "@/components/ui/checkbox";
import { TableSkeleton } from "./TableSkeleton";

export interface DataTableColumn<T> {
  id: string;
  header: React.ReactNode;
  accessor?: keyof T;
  cell?: (row: T) => React.ReactNode;
  className?: string;
}

export type SummaryCell = {
  columnId: string;
  value: React.ReactNode;
};

export interface DataTableStandardProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  caption?: React.ReactNode;
  onRowClick?: (row: T) => void;
  density?: "comfortable" | "compact";
  groupBy?: (row: T) => string | number;
  renderGroupHeader?: (groupKey: string, rows: T[]) => React.ReactNode;
  renderGroupSummaryRow?: (groupKey: string, rows: T[]) => SummaryCell[];
  renderSummaryRow?: (rows: T[]) => SummaryCell[];
  /** Enable row selection checkboxes */
  selectable?: boolean;
  /** Currently selected row IDs */
  selectedRows?: Set<string>;
  /** Callback when selection changes */
  onSelectionChange?: (selected: Set<string>) => void;
  /** Function to get unique ID from row (defaults to row.id) */
  getRowId?: (row: T) => string;
}

/**
 * Lightweight, framework-agnostic data table for list pages.
 * Supports simple accessors or custom cell renderers and exposes onRowClick.
 * Row selection is controlled via selectable, selectedRows, and onSelectionChange props.
 */
export function DataTableStandard<T extends Record<string, unknown>>({
  columns,
  data,
  loading,
  emptyState,
  caption,
  onRowClick,
  density = "comfortable",
  groupBy,
  renderGroupHeader,
  renderGroupSummaryRow,
  renderSummaryRow,
  selectable = false,
  selectedRows = new Set(),
  onSelectionChange,
  getRowId = (row: T) => String((row as Record<string, unknown>).id ?? ""),
}: DataTableStandardProps<T>) {
  // Derive selection state helpers
  const allRowIds = React.useMemo(() => data.map(getRowId), [data, getRowId]);
  const allSelected = allRowIds.length > 0 && allRowIds.every((id) => selectedRows.has(id));
  const someSelected = allRowIds.some((id) => selectedRows.has(id)) && !allSelected;

  const toggleAll = React.useCallback(() => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(allRowIds));
    }
  }, [allSelected, allRowIds, onSelectionChange]);

  const toggleRow = React.useCallback(
    (rowId: string) => {
      if (!onSelectionChange) return;
      const next = new Set(selectedRows);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      onSelectionChange(next);
    },
    [selectedRows, onSelectionChange]
  );

  if (loading) {
    return <TableSkeleton rows={6} />;
  }

  if (!data.length && emptyState) {
    return <>{emptyState}</>;
  }

  const grouped = groupBy
    ? (() => {
        const map = new Map<
          string | number,
          { key: string | number; rows: T[]; order: number }
        >();
        data.forEach((row, index) => {
          const key = groupBy(row);
          if (!map.has(key)) {
            map.set(key, { key, rows: [], order: index });
          }
          map.get(key)?.rows.push(row);
        });
        return Array.from(map.values()).sort((a, b) => a.order - b.order);
      })()
    : null;

  const renderSummaryCells = (rows: T[] | undefined) => {
    if (!rows || !renderSummaryRow) return null;
    const summaryCells = renderSummaryRow(rows);
    if (!summaryCells || summaryCells.length === 0) return null;
    const summaryMap = new Map(summaryCells.map((cell) => [cell.columnId, cell.value]));
    return (
      <TableRow className="bg-muted/50 font-medium">
        {selectable && <TableCell className="w-10 pe-0" />}
        {columns.map((column) => (
          <TableCell key={`summary-${column.id}`} className={column.className}>
            {summaryMap.get(column.id) ?? ""}
          </TableCell>
        ))}
      </TableRow>
    );
  };

  const renderGroupSummaryCells = (groupKey: string | number, rows: T[]) => {
    if (!renderGroupSummaryRow) return null;
    const summaryCells = renderGroupSummaryRow(String(groupKey), rows);
    if (!summaryCells || summaryCells.length === 0) return null;
    const summaryMap = new Map(summaryCells.map((cell) => [cell.columnId, cell.value]));
    return (
      <TableRow className="bg-muted/40 font-medium">
        {selectable && <TableCell className="w-10 pe-0" />}
        {columns.map((column) => (
          <TableCell key={`group-summary-${String(groupKey)}-${column.id}`} className={column.className}>
            {summaryMap.get(column.id) ?? ""}
          </TableCell>
        ))}
      </TableRow>
    );
  };

  const renderDataRow = (row: T, idx: number | string) => {
    const rowId = getRowId(row);
    const isSelected = selectedRows.has(rowId);
    return (
      <TableRow
        key={String((row as Record<string, unknown>).id ?? idx)}
        className={`${onRowClick ? "cursor-pointer" : ""} ${density === "compact" ? "[&>td]:py-2 [&>th]:py-2" : "[&>td]:py-3 [&>th]:py-3"} ${isSelected ? "bg-accent/50" : ""}`}
        onClick={onRowClick ? () => onRowClick(row) : undefined}
        data-selected={isSelected}
      >
        {selectable && (
          <TableCell className="w-10 pe-0">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleRow(rowId)}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Select row ${rowId}`}
            />
          </TableCell>
        )}
        {columns.map((column) => {
          const rowAsRecord = row as Record<string, unknown>;
          const value =
            column.cell?.(row) ??
            (column.accessor ? (rowAsRecord[column.accessor as string] as React.ReactNode) : null);
          return (
            <TableCell key={`${String(rowAsRecord.id ?? idx)}-${column.id}`} className={column.className}>
              {value}
            </TableCell>
          );
        })}
      </TableRow>
    );
  };

  // Compute column count for colSpan (includes checkbox column if selectable)
  const totalColumns = selectable ? columns.length + 1 : columns.length;

  return (
    <Table>
      {caption ? <TableCaption>{caption}</TableCaption> : null}
      <TableHeader>
        <TableRow className={density === "compact" ? "[&>th]:py-2 [&>td]:py-2" : "[&>th]:py-3 [&>td]:py-3"}>
          {selectable && (
            <TableHead className="w-10 pe-0">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
                aria-label={someSelected ? "Some rows selected" : allSelected ? "Deselect all rows" : "Select all rows"}
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
        {grouped
          ? grouped.map((group) => (
              <React.Fragment key={String(group.key)}>
                <TableRow className={density === "compact" ? "[&>td]:py-2 [&>th]:py-2 bg-muted/60" : "[&>td]:py-3 [&>th]:py-3 bg-muted/60"}>
                  <TableCell colSpan={totalColumns} className="font-medium">
                    {renderGroupHeader ? renderGroupHeader(String(group.key), group.rows) : String(group.key)}
                  </TableCell>
                </TableRow>
                {group.rows.map((row, idx) => renderDataRow(row, `${group.key}-${idx}`))}
                {renderGroupSummaryCells(group.key, group.rows)}
              </React.Fragment>
            ))
          : data.map((row, idx) => renderDataRow(row, idx))}
        {renderSummaryCells(data)}
      </TableBody>
    </Table>
  );
}

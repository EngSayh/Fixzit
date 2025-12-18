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
}

/**
 * Lightweight, framework-agnostic data table for list pages.
 * Supports simple accessors or custom cell renderers and exposes onRowClick.
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
}: DataTableStandardProps<T>) {
  if (loading) {
    return <TableSkeleton rows={6} />;
  }

  if (!data.length && emptyState) {
    return <>{emptyState}</>;
  }

  const grouped = React.useMemo(() => {
    if (!groupBy) return null;
    const map = new Map<string | number, { key: string | number; rows: T[]; order: number }>();
    data.forEach((row, index) => {
      const key = groupBy(row);
      if (!map.has(key)) {
        map.set(key, { key, rows: [], order: index });
      }
      map.get(key)?.rows.push(row);
    });
    return Array.from(map.values()).sort((a, b) => a.order - b.order);
  }, [data, groupBy]);

  const renderSummaryCells = (rows: T[] | undefined) => {
    if (!rows || !renderSummaryRow) return null;
    const summaryCells = renderSummaryRow(rows);
    if (!summaryCells || summaryCells.length === 0) return null;
    const summaryMap = new Map(summaryCells.map((cell) => [cell.columnId, cell.value]));
    return (
      <TableRow className="bg-muted/50 font-medium">
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
        {columns.map((column) => (
          <TableCell key={`group-summary-${String(groupKey)}-${column.id}`} className={column.className}>
            {summaryMap.get(column.id) ?? ""}
          </TableCell>
        ))}
      </TableRow>
    );
  };

  const renderDataRow = (row: T, idx: number | string) => (
    <TableRow
      key={String((row as Record<string, unknown>).id ?? idx)}
      className={`${onRowClick ? "cursor-pointer" : ""} ${density === "compact" ? "[&>td]:py-2 [&>th]:py-2" : "[&>td]:py-3 [&>th]:py-3"}`}
      onClick={onRowClick ? () => onRowClick(row) : undefined}
    >
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

  return (
    <Table>
      {caption ? <TableCaption>{caption}</TableCaption> : null}
      <TableHeader>
        <TableRow className={density === "compact" ? "[&>th]:py-2 [&>td]:py-2" : "[&>th]:py-3 [&>td]:py-3"}>
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
                  <TableCell colSpan={columns.length} className="font-medium">
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

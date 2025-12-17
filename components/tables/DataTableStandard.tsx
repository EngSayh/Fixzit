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

export interface DataTableStandardProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  caption?: React.ReactNode;
  onRowClick?: (row: T) => void;
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
}: DataTableStandardProps<T>) {
  if (loading) {
    return <TableSkeleton rows={6} />;
  }

  if (!data.length && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <Table>
      {caption ? <TableCaption>{caption}</TableCaption> : null}
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.id} className={column.className}>
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, idx) => (
          <TableRow
            key={String(row.id ?? idx)}
            className={onRowClick ? "cursor-pointer" : undefined}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
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
        ))}
      </TableBody>
    </Table>
  );
}

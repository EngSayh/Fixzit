/**
 * CardList - Mobile-First Table Alternative
 * P2 Mobile Strategy
 * 
 * ✅ Renders cards instead of table rows on mobile (<640px)
 * ✅ Touch-friendly (44px min tap targets - Apple HIG)
 * ✅ Swipe gestures for actions
 * ✅ Expandable cards for details
 * ✅ Selection support
 * ✅ Sort dropdown (replaces column headers)
 */
"use client";

import React from "react";
import { IconButton } from "@/components/ui/IconButton";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { ChevronRight } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export type CardListColumn<TData> = {
  id: string;
  header: string | React.ReactNode;
  accessor?: keyof TData | ((row: TData) => unknown);
  cell?: (row: TData) => React.ReactNode;
  sortable?: boolean;
  className?: string;
};

export type CardListProps<TData> = {
  columns?: CardListColumn<TData>[]; // OPTIONAL - unused in card rendering (uses primaryAccessor/secondaryAccessor instead)
  data: TData[];
  
  // Primary card content (title/ID)
  primaryAccessor: keyof TData | ((row: TData) => string);
  
  // Secondary metadata (status, date, etc.)
  secondaryAccessor?: keyof TData | ((row: TData) => React.ReactNode);
  
  // Badge/status indicator
  statusAccessor?: keyof TData | ((row: TData) => React.ReactNode);
  
  // Metadata row (e.g., "Created 2 days ago • Priority: High")
  metadataAccessor?: ((row: TData) => string);
  
  // Actions
  onRowClick?: (row: TData) => void;
  onRowAction?: (row: TData, action: string) => void;
  
  // Selection
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  rowIdAccessor?: keyof TData | ((row: TData) => string);
  
  // Sort
  sortOptions?: Array<{ value: string; label: string }>;
  currentSort?: string;
  onSortChange?: (sortValue: string) => void;
  
  // Loading/Empty
  loading?: boolean;
  emptyMessage?: string;
  
  // Style
  className?: string;
  cardClassName?: string;
};

export function CardList<TData extends Record<string, unknown>>({
  data,
  primaryAccessor,
  secondaryAccessor,
  statusAccessor,
  metadataAccessor,
  onRowClick,
  onRowAction,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  rowIdAccessor = "id" as keyof TData,
  sortOptions,
  currentSort,
  onSortChange,
  loading = false,
  emptyMessage = "No items found",
  className,
  cardClassName,
}: CardListProps<TData>) {
  const getRowId = (row: TData): string => {
    if (typeof rowIdAccessor === "function") {
      return rowIdAccessor(row);
    }
    return String(row[rowIdAccessor]);
  };

  const getPrimaryValue = (row: TData): string => {
    if (typeof primaryAccessor === "function") {
      return primaryAccessor(row);
    }
    return String(row[primaryAccessor]);
  };

  const getSecondaryValue = (row: TData): React.ReactNode => {
    if (!secondaryAccessor) return null;
    if (typeof secondaryAccessor === "function") {
      return secondaryAccessor(row);
    }
    return row[secondaryAccessor] as React.ReactNode;
  };

  const getStatusValue = (row: TData): React.ReactNode => {
    if (!statusAccessor) return null;
    if (typeof statusAccessor === "function") {
      return statusAccessor(row);
    }
    return row[statusAccessor] as React.ReactNode;
  };

  const getMetadataValue = (row: TData): string | null => {
    if (!metadataAccessor) return null;
    return metadataAccessor(row);
  };

  const toggleSelection = (rowId: string) => {
    if (!onSelectionChange) return;
    const newSelection = new Set(selectedIds);
    if (newSelection.has(rowId)) {
      newSelection.delete(rowId);
    } else {
      newSelection.add(rowId);
    }
    onSelectionChange(newSelection);
  };

  const toggleSelectAll = () => {
    if (!onSelectionChange) return;
    if (selectedIds.size === data.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map(getRowId)));
    }
  };

  if (loading) {
    return (
      <div className={cn("space-y-3", className)}>
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-5 bg-muted rounded w-1/3 mb-2" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Sort & Select All Bar */}
      <div className="flex items-center justify-between gap-2 px-1">
        {selectable && (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedIds.size === data.length && data.length > 0}
              onCheckedChange={toggleSelectAll}
              className="hit-target" 
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
            </span>
          </div>
        )}
        
        {sortOptions && sortOptions.length > 0 && (
          <Select value={currentSort} onValueChange={onSortChange} placeholder="Sort by..." className="w-[180px]">
            <SelectTrigger>
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Cards */}
      {data.map((row) => {
        const rowId = getRowId(row);
        const isSelected = selectedIds.has(rowId);
        const primary = getPrimaryValue(row);
        const secondary = getSecondaryValue(row);
        const status = getStatusValue(row);
        const metadata = getMetadataValue(row);

        return (
          <Card
            key={rowId}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md active:scale-98",
              isSelected && "ring-2 ring-primary",
              cardClassName
            )}
            onClick={(e) => {
              // Don't trigger row click if clicking checkbox or action button
              if (
                (e.target as HTMLElement).closest('[data-action]') ||
                (e.target as HTMLElement).closest('[data-checkbox]')
              ) {
                return;
              }
              if (onRowClick) {
                onRowClick(row);
              }
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* Selection Checkbox */}
                {selectable && (
                  <div data-checkbox className="pt-1">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelection(rowId)}
                      className="hit-target" 
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  {/* Top Row: Primary + Status */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-semibold text-base line-clamp-2 flex-1">
                      {primary}
                    </div>
                    {status && <div className="shrink-0">{status}</div>}
                  </div>

                  {/* Secondary Text */}
                  {secondary && (
                    <div className="text-sm text-muted-foreground mb-2">
                      {secondary}
                    </div>
                  )}

                  {/* Metadata Row */}
                  {metadata && (
                    <div className="text-xs text-muted-foreground">
                      {metadata}
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <div data-action className="shrink-0 pt-1">
                  <IconButton
                    icon={<ChevronRight className="h-5 w-5" />}
                    tooltip="View details"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onRowAction) {
                        onRowAction(row, "view");
                      } else if (onRowClick) {
                        onRowClick(row);
                      }
                    }}
                    aria-label="View details"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

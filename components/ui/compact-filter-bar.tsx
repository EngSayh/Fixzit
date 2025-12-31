"use client";

/**
 * CompactFilterBar - Centralized filter bar component
 * 
 * Provides a consistent, compact horizontal filter layout across the codebase.
 * Reduces vertical space by ~50% compared to traditional multi-row filters.
 * 
 * @module components/ui/compact-filter-bar
 */

import React from "react";
import { Search, XCircle } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface FilterTab {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface FilterDropdown {
  id: string;
  value: string;
  placeholder: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  width?: string;
}

export interface FilterAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}

export interface CompactFilterBarProps {
  /** Search configuration */
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    width?: string;
  };
  /** Status/quick filter tabs */
  tabs?: {
    items: FilterTab[];
    value: string;
    onChange: (value: string) => void;
  };
  /** Dropdown filters */
  dropdowns?: FilterDropdown[];
  /** Action buttons (like Quick Wins, Stale, etc.) */
  actions?: FilterAction[];
  /** Whether any filter is active (shows clear button) */
  hasActiveFilter?: boolean;
  /** Clear all filters handler */
  onClearFilters?: () => void;
  /** Additional className */
  className?: string;
  /** Sticky positioning */
  sticky?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function CompactFilterBar({
  search,
  tabs,
  dropdowns,
  actions,
  hasActiveFilter,
  onClearFilters,
  className,
  sticky = false,
}: CompactFilterBarProps) {
  return (
    <Card className={cn(
      "bg-muted border-input",
      sticky && "sticky top-0 z-10",
      className
    )}>
      <CardContent className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          {search && (
            <div className={cn("relative", search.width || "w-[180px] lg:w-[220px]")}>
              <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={search.placeholder || "Search..."}
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                className="h-8 ps-8 text-sm bg-background border-input"
              />
            </div>
          )}

          {/* Divider after search */}
          {search && (tabs || dropdowns?.length || actions?.length) && (
            <div className="h-6 w-px bg-border hidden sm:block" />
          )}

          {/* Tabs */}
          {tabs && (
            <div className="flex items-center gap-1">
              {tabs.items.map(({ value, label, icon }) => (
                <Button
                  key={value}
                  variant={tabs.value === value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => tabs.onChange(value)}
                  className={cn(
                    "h-7 px-2.5 text-xs",
                    tabs.value !== value && "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {icon && <span className="me-1">{icon}</span>}
                  {label}
                </Button>
              ))}
            </div>
          )}

          {/* Divider after tabs */}
          {tabs && (dropdowns?.length || actions?.length) && (
            <div className="h-6 w-px bg-border hidden sm:block" />
          )}

          {/* Dropdowns */}
          {dropdowns?.map((dropdown, index) => (
            <React.Fragment key={dropdown.id}>
              <Select value={dropdown.value} onValueChange={dropdown.onChange}>
                <SelectTrigger className={cn("h-8 text-xs bg-background border-input", dropdown.width || "w-[110px]")}>
                  {dropdown.value === "all" ? dropdown.placeholder : dropdown.options.find(o => o.value === dropdown.value)?.label}
                </SelectTrigger>
                <SelectContent>
                  {dropdown.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Divider between dropdowns and actions */}
              {index === dropdowns.length - 1 && actions?.length && (
                <div className="h-6 w-px bg-border hidden sm:block" />
              )}
            </React.Fragment>
          ))}

          {/* Actions */}
          {actions && actions.length > 0 && (
            <div className="flex items-center gap-1">
              {actions.map(({ id, label, icon, active, onClick }) => (
                <Button
                  key={id}
                  variant={active ? "default" : "ghost"}
                  size="sm"
                  onClick={onClick}
                  className={cn(
                    "h-7 px-2 text-xs",
                    !active && "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {icon && <span className="me-1">{icon}</span>}
                  {label}
                </Button>
              ))}
            </div>
          )}

          {/* Clear Filters - Right aligned */}
          {hasActiveFilter && onClearFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground ms-auto"
            >
              <XCircle className="h-3.5 w-3.5 me-1" />
              Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Simple variant for basic filter needs
// ============================================================================

export interface SimpleFilterBarProps {
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  filters?: FilterDropdown[];
  onClear?: () => void;
  className?: string;
}

export function SimpleFilterBar({
  search,
  filters,
  onClear,
  className,
}: SimpleFilterBarProps) {
  const hasActiveFilter = 
    (search && search.value !== "") ||
    (filters && filters.some(f => f.value !== "all"));

  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardContent className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          {search && (
            <div className="relative flex-1 min-w-[180px] max-w-[280px]">
              <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={search.placeholder || "Search..."}
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                className="h-8 ps-8 text-sm bg-muted border-input"
              />
            </div>
          )}

          {/* Filters */}
          {filters?.map((filter) => (
            <Select key={filter.id} value={filter.value} onValueChange={filter.onChange}>
              <SelectTrigger className={cn("h-8 text-xs bg-muted border-input", filter.width || "w-[130px]")}>
                {filter.value === "all" ? filter.placeholder : filter.options.find(o => o.value === filter.value)?.label}
              </SelectTrigger>
              <SelectContent>
                {filter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}

          {/* Clear */}
          {hasActiveFilter && onClear && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <XCircle className="h-3.5 w-3.5 me-1" />
              Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

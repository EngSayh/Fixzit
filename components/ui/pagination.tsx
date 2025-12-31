"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "@/components/ui/icons";
import { useTranslation } from "@/contexts/TranslationContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

/** Standard page size options */
export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number] | "all";

interface PaginationProps {
  /** Current page (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Total items (for showing "Showing X of Y") */
  totalItems?: number;
  /** Items per page (for calculations) */
  itemsPerPage?: number;
  /** Page size options to show (default: [25, 50, 100]) */
  pageSizeOptions?: readonly number[];
  /** Whether currently showing all items */
  showingAll?: boolean;
  /** Callback when page size changes */
  onPageSizeChange?: (size: number | "all") => void;
  /** Show page size selector (default: true if onPageSizeChange provided) */
  showPageSizeSelector?: boolean;
  /** Show jump to page input (default: true if more than 10 pages) */
  showJumpToPage?: boolean;
  /** Show first/last buttons (default: true) */
  showFirstLast?: boolean;
  /** Compact mode - hide some controls on mobile */
  compact?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = 25,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  showingAll = false,
  onPageSizeChange,
  showPageSizeSelector = !!onPageSizeChange,
  showJumpToPage,
  showFirstLast = true,
  compact = false,
}: PaginationProps) {
  const { t, isRTL } = useTranslation();
  const [jumpValue, setJumpValue] = useState("");

  // Calculate visible page range (smart ellipsis)
  const maxVisiblePages = compact ? 3 : 5;

  const { pages, showStartEllipsis, showEndEllipsis } = useMemo(() => {
    const result: number[] = [];
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Adjust if we're near the end
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      result.push(i);
    }

    return {
      pages: result,
      showStartEllipsis: startPage > 2,
      showEndEllipsis: endPage < totalPages - 1,
    };
  }, [currentPage, totalPages, maxVisiblePages]);

  // Calculate display values
  const showingFrom = totalItems ? (currentPage - 1) * itemsPerPage + 1 : null;
  const showingTo = totalItems
    ? Math.min(currentPage * itemsPerPage, totalItems)
    : null;

  // RTL-aware icons
  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;
  const FirstIcon = isRTL ? ChevronsRight : ChevronsLeft;
  const LastIcon = isRTL ? ChevronsLeft : ChevronsRight;

  // Navigation helpers
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;
  const canGoFirst = currentPage > 1;
  const canGoLast = currentPage < totalPages;

  // Determine if we should show jump-to-page
  const shouldShowJump =
    showJumpToPage !== undefined ? showJumpToPage : totalPages > 10;

  // Handle jump to page
  const handleJump = useCallback(() => {
    const page = parseInt(jumpValue, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
      setJumpValue("");
    }
  }, [jumpValue, totalPages, onPageChange]);

  const handleJumpKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleJump();
      }
    },
    [handleJump]
  );

  // Handle page size change
  const handlePageSizeChange = useCallback(
    (value: string) => {
      if (onPageSizeChange) {
        if (value === "all") {
          onPageSizeChange("all");
        } else {
          onPageSizeChange(parseInt(value, 10));
        }
      }
    },
    [onPageSizeChange]
  );

  // Don't render if only one page and no page size selector
  if (totalPages <= 1 && !showPageSizeSelector) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-2 py-4">
      {/* Left: Showing X of Y + Page Size */}
      <div className="flex items-center gap-4">
        {/* Showing X of Y */}
        {totalItems !== undefined && totalItems > 0 && (
          <div className="text-sm text-muted-foreground">
            {t("pagination.showing", "Showing")}{" "}
            <span className="font-medium text-foreground">{showingFrom}</span>
            {" - "}
            <span className="font-medium text-foreground">{showingTo}</span>{" "}
            {t("pagination.of", "of")}{" "}
            <span className="font-medium text-foreground">{totalItems}</span>
          </div>
        )}

        {/* Page Size Selector */}
        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {t("pagination.rowsPerPage", "Rows per page")}:
            </span>
            <Select
              value={showingAll ? "all" : String(itemsPerPage)}
              onValueChange={handlePageSizeChange}
              placeholder={String(itemsPerPage)}
            >
              <SelectTrigger className="w-[80px] h-8">
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
                <SelectItem value="all">
                  {t("pagination.all", "All")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Right: Navigation Controls */}
      <div className="flex items-center gap-1 sm:gap-2 ms-auto">
        {/* Jump to Page */}
        {shouldShowJump && !compact && (
          <div className="hidden md:flex items-center gap-1 me-2">
            <span className="text-sm text-muted-foreground">
              {t("pagination.goTo", "Go to")}:
            </span>
            <Input
              type="number"
              min={1}
              max={totalPages}
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              onKeyDown={handleJumpKeyDown}
              onBlur={handleJump}
              className="w-16 h-8 text-center"
              placeholder="#"
            />
          </div>
        )}

        {/* First Page */}
        {showFirstLast && (
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(1)}
            disabled={!canGoFirst}
            title={t("pagination.first", "First page")}
          >
            <FirstIcon className="h-4 w-4" />
          </Button>
        )}

        {/* Previous */}
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrev}
        >
          <PrevIcon className="h-4 w-4" />
          <span className="hidden sm:inline ms-1">
            {t("pagination.previous", "Previous")}
          </span>
        </Button>

        {/* Page Numbers */}
        <div className="hidden sm:flex items-center gap-1">
          {/* First page if not in range */}
          {pages[0] > 1 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onPageChange(1)}
            >
              1
            </Button>
          )}

          {/* Start ellipsis */}
          {showStartEllipsis && (
            <span className="px-1 text-muted-foreground">...</span>
          )}

          {/* Visible pages */}
          {pages.map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onPageChange(page)}
            >
              {page}
            </Button>
          ))}

          {/* End ellipsis */}
          {showEndEllipsis && (
            <span className="px-1 text-muted-foreground">...</span>
          )}

          {/* Last page if not in range */}
          {pages[pages.length - 1] < totalPages && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onPageChange(totalPages)}
            >
              {totalPages}
            </Button>
          )}
        </div>

        {/* Mobile page indicator */}
        <span className="sm:hidden text-sm text-muted-foreground px-2">
          {currentPage}/{totalPages}
        </span>

        {/* Next */}
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
        >
          <span className="hidden sm:inline me-1">
            {t("pagination.next", "Next")}
          </span>
          <NextIcon className="h-4 w-4" />
        </Button>

        {/* Last Page */}
        {showFirstLast && (
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(totalPages)}
            disabled={!canGoLast}
            title={t("pagination.last", "Last page")}
          >
            <LastIcon className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default Pagination;


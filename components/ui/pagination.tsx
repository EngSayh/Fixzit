"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
}: PaginationProps) {
  const { t, isRTL } = useTranslation();

  const pages = [];
  const maxVisiblePages = 5;

  // Calculate which pages to show
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  // Use consistent default for itemsPerPage
  const perPage = itemsPerPage || 10;
  const showingFrom = totalItems ? (currentPage - 1) * perPage + 1 : null;
  const showingTo = totalItems
    ? Math.min(currentPage * perPage, totalItems)
    : null;

  // RTL-aware icons
  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div className="flex items-center justify-between px-2 py-4">
      {totalItems && (
        <div className="text-sm text-muted-foreground">
          {t("pagination.showing", "Showing")}{" "}
          <span className="font-medium text-foreground">{showingFrom}</span>{" "}
          {t("pagination.to", "to")}{" "}
          <span className="font-medium text-foreground">{showingTo}</span>{" "}
          {t("pagination.of", "of")}{" "}
          <span className="font-medium text-foreground">{totalItems}</span>{" "}
          {t("pagination.results", "results")}
        </div>
      )}

      <div className="flex items-center gap-2 ms-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <PrevIcon className="h-4 w-4" />
          {t("common.previous", "Previous")}
        </Button>

        {startPage > 1 && (
          <>
            <Button variant="outline" size="sm" onClick={() => onPageChange(1)}>
              1
            </Button>
            {startPage > 2 && (
              <span className="px-2 text-muted-foreground">...</span>
            )}
          </>
        )}

        {pages.map((page) => (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(page)}
          >
            {page}
          </Button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && (
              <span className="px-2 text-muted-foreground">...</span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(totalPages)}
            >
              {totalPages}
            </Button>
          </>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          {t("common.next", "Next")}
          <NextIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

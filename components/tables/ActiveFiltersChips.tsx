"use client";

import React from "react";
import { Chip } from "@/components/ui/chip";
import { useTranslation } from "@/lib/i18n/client";

export interface ActiveFilter {
  key: string;
  label: string;
  onRemove?: () => void;
}

interface ActiveFiltersChipsProps {
  filters: ActiveFilter[];
  onClearAll?: () => void;
  className?: string;
}

/**
 * Displays active filters as removable chips with optional "Clear all".
 */
export function ActiveFiltersChips({
  filters,
  onClearAll,
  className,
}: ActiveFiltersChipsProps) {
  const { t } = useTranslation();
  
  if (!filters.length) {
    return null;
  }

  return (
    <div className={["flex flex-wrap items-center gap-2", className].filter(Boolean).join(" ")}>
      {filters.map((filter) => (
        <Chip
          key={filter.key}
          size="sm"
          selected
          onRemove={filter.onRemove}
          aria-label={`Remove filter ${filter.label}`}
        >
          {filter.label}
        </Chip>
      ))}
      {onClearAll ? (
        <button
          type="button"
          className="text-sm font-medium text-primary hover:underline"
          onClick={onClearAll}
          aria-label={t("common.clearAllFilters", "Clear all filters")}
        >
          {t("common.clearAll", "Clear all")}
        </button>
      ) : null}
    </div>
  );
}

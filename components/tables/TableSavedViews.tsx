import React from "react";
import { Select, SelectItem } from "@/components/ui/select";

export interface SavedViewOption {
  id: string;
  label: string;
}

interface TableSavedViewsProps {
  views: SavedViewOption[];
  value?: string;
  onChange?: (id: string) => void;
}

/**
 * Saved views selector for tables (e.g., My Open, Overdue).
 */
export function TableSavedViews({ views, value, onChange }: TableSavedViewsProps) {
  if (!views.length) {
    return null;
  }

  return (
    <Select
      value={value}
      onValueChange={(val) => onChange?.(val)}
      placeholder="Saved views"
      className="min-w-[180px] bg-muted border-input text-foreground"
    >
      {views.map((view) => (
        <SelectItem key={view.id} value={view.id}>
          {view.label}
        </SelectItem>
      ))}
    </Select>
  );
}

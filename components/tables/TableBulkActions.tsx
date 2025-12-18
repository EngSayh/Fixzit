import React from "react";
import { Button } from "@/components/ui/button";

export interface BulkAction {
  key: string;
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "secondary" | "destructive";
  shortcut?: string; // e.g., "ctrl+shift+A"
}

interface TableBulkActionsProps {
  actions: BulkAction[];
  disabled?: boolean;
}

/**
 * Bulk action bar for selected table rows.
 */
export function TableBulkActions({ actions, disabled }: TableBulkActionsProps) {
  if (!actions.length) {
    return null;
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    actions.forEach((action) => {
      if (!action.shortcut || disabled) return;
      const combo = action.shortcut.toLowerCase();
      const needsCtrl = combo.includes("ctrl+");
      const needsShift = combo.includes("shift+");
      const needsAlt = combo.includes("alt+");
      const key = combo.split("+").pop();
      if (
        key &&
        event.key.toLowerCase() === key &&
        (!needsCtrl || event.ctrlKey) &&
        (!needsShift || event.shiftKey) &&
        (!needsAlt || event.altKey)
      ) {
        event.preventDefault();
        action.onClick();
      }
    });
  };

  return (
    <div
      className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card px-4 py-3"
      role="toolbar"
      aria-label="Bulk actions"
      onKeyDown={handleKeyDown}
    >
      {actions.map((action) => (
        <Button
          key={action.key}
          size="sm"
          variant={action.variant ?? "outline"}
          disabled={disabled}
          onClick={action.onClick}
          aria-keyshortcuts={action.shortcut}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}

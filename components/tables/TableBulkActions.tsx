import React from "react";
import { ActionButton } from "@/components/ui/action-feedback";
import type { ActionType } from "@/components/ui/action-feedback";

export interface BulkAction {
  key: string;
  label: string;
  onClick: () => Promise<void> | void;
  variant?: "default" | "outline" | "secondary" | "destructive";
  /** Action type for inline feedback (save, delete, copy, etc.) */
  actionType?: ActionType;
  /** Tooltip text for hover information */
  tooltip?: string;
}

interface TableBulkActionsProps {
  actions: BulkAction[];
  disabled?: boolean;
}

/**
 * Bulk action bar for selected table rows.
 * Now supports inline confirmation feedback and tooltips.
 */
export function TableBulkActions({ actions, disabled }: TableBulkActionsProps) {
  if (!actions.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card px-4 py-3">
      {actions.map((action) => (
        <ActionButton
          key={action.key}
          size="sm"
          variant={action.variant ?? "outline"}
          disabled={disabled}
          onClick={action.onClick}
          actionType={action.actionType ?? "generic"}
          tooltip={action.tooltip}
        >
          {action.label}
        </ActionButton>
      ))}
    </div>
  );
}

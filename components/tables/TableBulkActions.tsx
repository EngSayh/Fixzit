import { Button } from "@/components/ui/button";

export interface BulkAction {
  key: string;
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "secondary" | "destructive";
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

  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card px-4 py-3">
      {actions.map((action) => (
        <Button
          key={action.key}
          size="sm"
          variant={action.variant ?? "outline"}
          disabled={disabled}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}

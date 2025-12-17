import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export interface VisibilityColumn {
  id: string;
  label: string;
  visible: boolean;
  onToggle: (next: boolean) => void;
}

interface TableColumnVisibilityProps {
  columns: VisibilityColumn[];
}

/**
 * Column visibility controller for tables.
 */
export function TableColumnVisibility({ columns }: TableColumnVisibilityProps) {
  if (!columns.length) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card px-4 py-3">
      <span className="text-sm font-semibold text-foreground">Columns</span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {columns.map((col) => (
          <label key={col.id} className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox
              checked={col.visible}
              onCheckedChange={(checked) => col.onToggle(Boolean(checked))}
              aria-label={`Toggle column ${col.label}`}
            />
            <Label className="cursor-pointer">{col.label}</Label>
          </label>
        ))}
      </div>
    </div>
  );
}

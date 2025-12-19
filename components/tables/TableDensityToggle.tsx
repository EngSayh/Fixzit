import React from "react";
import { Switch } from "@/components/ui/switch";

interface TableDensityToggleProps {
  density: "comfortable" | "compact";
  onChange: (density: "comfortable" | "compact") => void;
}

/**
 * Density toggle for table rows (comfortable vs compact).
 */
export function TableDensityToggle({ density, onChange }: TableDensityToggleProps) {
  const isCompact = density === "compact";

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5">
      <span className="text-sm text-muted-foreground">Comfortable</span>
      <Switch
        checked={isCompact}
        onCheckedChange={(checked) => onChange(checked ? "compact" : "comfortable")}
        aria-label="Toggle table density"
      />
      <span className="text-sm text-muted-foreground">Compact</span>
    </div>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";

interface TableToolbarProps {
  start?: React.ReactNode;
  end?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Responsive toolbar layout for table controls (search, quick chips, filter buttons).
 */
export function TableToolbar({ start, end, children, className }: TableToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 md:flex-row md:items-center md:justify-between",
        className,
      )}
    >
      <div className="flex flex-1 flex-wrap items-center gap-3">
        {start}
        {children}
      </div>
      {end ? <div className="flex flex-wrap items-center gap-2">{end}</div> : null}
    </div>
  );
}

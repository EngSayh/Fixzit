"use client";

import React from "react";
import { cn } from "@/lib/utils";

type StatusLevel = "operational" | "degraded" | "maintenance";

interface StatusIndicatorProps {
  status?: StatusLevel;
  label: string;
  detail?: string;
  className?: string;
}

const STATUS_COLORS: Record<StatusLevel, string> = {
  operational: "bg-emerald-500/90",
  degraded: "bg-amber-500/90",
  maintenance: "bg-blue-500/90",
};

const STATUS_BORDER: Record<StatusLevel, string> = {
  operational: "border-emerald-500/30",
  degraded: "border-amber-500/30",
  maintenance: "border-blue-500/30",
};

/**
 * Small, pill-shaped status indicator similar to analytics/status dashboards.
 * Uses a pulsing dot for live feel and optional detail text.
 */
export function StatusIndicator({
  status = "operational",
  label,
  detail,
  className,
}: StatusIndicatorProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur",
        STATUS_BORDER[status],
        className,
      )}
      aria-live="polite"
      role="status"
    >
      <span
        aria-hidden
        className={cn(
          "h-2.5 w-2.5 rounded-full shadow-[0_0_0_4px_rgba(16,185,129,0.12)]",
          STATUS_COLORS[status],
          status === "operational"
            ? "animate-pulse"
            : "animate-[pulse_3s_ease-in-out_infinite]",
        )}
      />
      <span className="text-[13px] font-semibold leading-tight">{label}</span>
      {detail ? (
        <span className="text-[11px] text-muted-foreground">{detail}</span>
      ) : null}
    </div>
  );
}

export default StatusIndicator;

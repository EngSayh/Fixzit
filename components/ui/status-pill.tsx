"use client";

import React from "react";
import clsx from "clsx";

type Status = "success" | "warning" | "danger" | "info" | "neutral";

const MAP: Record<Status, string> = {
  success: "bg-[var(--color-success-bg)] text-[var(--color-success-text)]",
  warning: "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]",
  danger: "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]",
  info: "bg-[var(--color-info-bg)] text-[var(--color-info-text)]",
  neutral: "bg-[var(--color-neutral-bg)] text-[var(--color-neutral-text)]",
};

interface StatusPillProps {
  status: Status;
  label: string;
  className?: string;
}

export function StatusPill({ status, label, className }: StatusPillProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium",
        MAP[status],
        className,
      )}
    >
      {label}
    </span>
  );
}

export default StatusPill;

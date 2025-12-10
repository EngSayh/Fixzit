"use client";

import React from "react";
import clsx from "clsx";

type Status = "success" | "warning" | "danger" | "info" | "neutral";

const MAP: Record<Status, string> = {
  success: "bg-[#D4EDDA] text-[#28A745]",
  warning: "bg-[#FFF3CD] text-[#856404]",
  danger: "bg-[#F8D7DA] text-[#DC3545]",
  info: "bg-[#D1ECF1] text-[#0C5460]",
  neutral: "bg-[#E2E3E5] text-[#383D41]",
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

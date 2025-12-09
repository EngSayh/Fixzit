"use client";

import React, { useEffect, useState } from "react";

interface SLATimerProps {
  dueDate: Date | string;
  status: string;
  priority?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * SLATimer Component
 *
 * Displays a live countdown timer showing time remaining until SLA breach.
 * Color-coded based on urgency:
 * - Green (safe): 4+ hours remaining
 * - Yellow (warning): 2-4 hours remaining
 * - Red (critical): Less than 2 hours remaining OR breached
 *
 * The timer updates every minute and displays appropriate visual indicators.
 */
export default function SLATimer({
  dueDate,
  status,
  priority,
  size = "md",
}: SLATimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [urgencyLevel, setUrgencyLevel] = useState<
    "safe" | "warning" | "critical"
  >("safe");
  const [isBreached, setIsBreached] = useState(false);

  useEffect(() => {
    // Don't show timer for closed/cancelled statuses
    if (["CLOSED", "CANCELLED", "ARCHIVED"].includes(status)) {
      return;
    }

    const calculateTimeRemaining = () => {
      const now = new Date();
      const due = new Date(dueDate);
      const diff = due.getTime() - now.getTime();

      // Check if breached
      if (diff <= 0) {
        setIsBreached(true);
        const overdue = Math.abs(diff);
        const hours = Math.floor(overdue / (1000 * 60 * 60));
        const minutes = Math.floor((overdue % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemaining(`${hours}h ${minutes}m overdue`);
        setUrgencyLevel("critical");
        return;
      }

      // Calculate remaining time
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeRemaining(`${hours}h ${minutes}m`);

      // Set urgency level
      if (hours < 2) {
        setUrgencyLevel("critical");
      } else if (hours < 4) {
        setUrgencyLevel("warning");
      } else {
        setUrgencyLevel("safe");
      }
    };

    // Initial calculation
    calculateTimeRemaining();

    // Update every minute
    const interval = setInterval(calculateTimeRemaining, 60000);

    return () => clearInterval(interval);
  }, [dueDate, status]);

  // Don't render for closed/cancelled
  if (["CLOSED", "CANCELLED", "ARCHIVED"].includes(status)) {
    return null;
  }

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  const urgencyColors = {
    safe: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/5 text-warning border-warning/20",
    critical: "bg-destructive/10 text-destructive border-destructive/20",
  };

  const icon = isBreached
    ? "⚠️"
    : urgencyLevel === "critical"
      ? "⏰"
      : urgencyLevel === "warning"
        ? "⏰"
        : "✓";

  return (
    <div
      className={`inline-flex items-center gap-1.5 font-medium rounded-md border ${sizeClasses[size]} ${urgencyColors[urgencyLevel]}`}
      title={`SLA ${isBreached ? "BREACHED" : "Due"}: ${new Date(dueDate).toLocaleString()}`}
    >
      <span className="text-base leading-none">{icon}</span>
      <span className="font-mono">{timeRemaining}</span>
      {priority === "URGENT" && <span className="text-xs">🔥</span>}
    </div>
  );
}

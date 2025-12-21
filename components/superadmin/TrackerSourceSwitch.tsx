"use client";

/**
 * TrackerSourceSwitch - Navigation between System Issues and Customer Requests
 *
 * @module components/superadmin/TrackerSourceSwitch
 */

import Link from "next/link";
import { Database, MessageSquare } from "lucide-react";

interface TrackerSourceSwitchProps {
  activeSource: "system-issues" | "customer-requests";
}

export function TrackerSourceSwitch({ activeSource }: TrackerSourceSwitchProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
      <Link
        href="/superadmin/issues"
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          activeSource === "system-issues"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-background"
        }`}
      >
        <Database className="h-4 w-4" />
        System Issues
      </Link>
      <Link
        href="/superadmin/customer-requests"
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          activeSource === "customer-requests"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-background"
        }`}
      >
        <MessageSquare className="h-4 w-4" />
        Customer Requests
      </Link>
    </div>
  );
}

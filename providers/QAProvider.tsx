"use client";

import React, { useMemo } from "react";
import { AutoFixAgent } from "@/qa/AutoFixAgent";
import { ErrorBoundary } from "@/qa/ErrorBoundary";

type Props = {
  children: React.ReactNode;
  enabled?: boolean;
  role:
    | "Super Admin"
    | "Admin"
    | "Corporate Owner"
    | "Team Member"
    | "Technician"
    | "Property Manager"
    | "Tenant"
    | "Vendor"
    | "Guest"
    | string;
  orgId: string;
};

export const QAContext = React.createContext<{
  enabled: boolean;
  role: string;
  orgId: string;
}>({ enabled: false, role: "Guest", orgId: "unknown" });

export function QAProvider({ children, enabled = false, role, orgId }: Props) {
  const value = useMemo(
    () => ({ enabled, role, orgId }),
    [enabled, role, orgId],
  );
  // Do not alter layout; we only mount an overlay/hook listeners.
  return (
    <QAContext.Provider value={value}>
      <ErrorBoundary>
        {children}
        {enabled && <AutoFixAgent />}
      </ErrorBoundary>
    </QAContext.Provider>
  );
}

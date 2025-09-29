'use client&apos;;

import React, { useEffect, useMemo, useState } from &apos;react&apos;;
import { AutoFixAgent } from &apos;@/src/qa/AutoFixAgent&apos;;
import { ErrorBoundary } from &apos;@/src/qa/ErrorBoundary&apos;;

type Props = {
  children: React.ReactNode;
  enabled?: boolean;
  role: &apos;Super Admin&apos;|'Admin&apos;|'Corporate Owner&apos;|'Team Member&apos;|'Technician&apos;|'Property Manager&apos;|'Tenant&apos;|'Vendor&apos;|'Guest&apos;|string;
  orgId: string;
};

export const QAContext = React.createContext<{
  enabled: boolean;
  role: string;
  orgId: string;
}>({ enabled: false, role: &apos;Guest&apos;, orgId: &apos;unknown&apos; });

export function QAProvider({ children, enabled = false, role, orgId }: Props) {
  const value = useMemo(() => ({ enabled, role, orgId }), [enabled, role, orgId]);
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

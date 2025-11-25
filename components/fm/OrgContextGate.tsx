"use client";

import { ReactNode } from "react";
import { OrgContextPrompt } from "@/components/fm/OrgContextPrompt";
import { FMErrorBoundary } from "@/components/fm/FMErrorBoundary";
import { useSupportOrg } from "@/contexts/SupportOrgContext";

interface OrgContextGateProps {
  children: ReactNode;
}

/**
 * Client-side gate that blocks module rendering until an organization
 * context is available. Centralizes the guard logic to avoid duplicating
 * organization checks across multiple route trees.
 *
 * Includes error boundary to prevent white screen crashes.
 */
export function OrgContextGate({ children }: OrgContextGateProps) {
  const { effectiveOrgId, canImpersonate, loading } = useSupportOrg();

  if (loading && !effectiveOrgId) {
    return (
      <div className="p-6">
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-border bg-card/30 p-6 space-y-3 animate-pulse"
        >
          <div className="h-4 w-56 rounded-md bg-muted" />
          <div className="h-3 w-64 rounded-md bg-muted/70" />
        </div>
      </div>
    );
  }

  if (!effectiveOrgId) {
    return (
      <div className="p-6">
        <OrgContextPrompt canImpersonate={canImpersonate} />
      </div>
    );
  }

  return <FMErrorBoundary>{children}</FMErrorBoundary>;
}

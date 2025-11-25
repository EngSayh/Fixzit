"use client";

import React, { useMemo } from "react";
import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import {
  OrgContextPrompt,
  type OrgContextPromptProps,
} from "@/components/fm/OrgContextPrompt";
import type { ModuleId } from "@/config/navigation";
import { useSupportOrg } from "@/contexts/SupportOrgContext";
import { useTranslation } from "@/contexts/TranslationContext";

type PromptOverrides = Pick<
  OrgContextPromptProps,
  | "title"
  | "impersonationMessage"
  | "fallbackMessage"
  | "children"
  | "className"
>;

interface UseFmOrgGuardOptions {
  moduleId?: ModuleId;
  includeTabsInFallback?: boolean;
  promptOverrides?: PromptOverrides;
}

export function useFmOrgGuard(options: UseFmOrgGuardOptions = {}) {
  const { moduleId, promptOverrides, includeTabsInFallback } = options;
  const showTabs = includeTabsInFallback ?? Boolean(moduleId);
  const { effectiveOrgId, canImpersonate, supportOrg, loading } =
    useSupportOrg();
  const { t } = useTranslation();
  const hasOrgContext = Boolean(effectiveOrgId);

  const guard = useMemo(() => {
    if (hasOrgContext) {
      return null;
    }

    const fallbackContent = loading ? (
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border border-border bg-card/30 p-6 space-y-3 animate-pulse"
      >
        <div className="h-4 w-56 rounded-md bg-muted" />
        <div className="h-3 w-64 rounded-md bg-muted/70" />
      </div>
    ) : (
      <OrgContextPrompt canImpersonate={canImpersonate} {...promptOverrides} />
    );

    return (
      <div className="space-y-6">
        {moduleId && showTabs ? <ModuleViewTabs moduleId={moduleId} /> : null}
        {fallbackContent}
      </div>
    );
  }, [
    hasOrgContext,
    loading,
    canImpersonate,
    promptOverrides,
    moduleId,
    showTabs,
  ]);

  const supportBanner = useMemo(() => {
    if (!supportOrg) {
      return null;
    }

    return (
      <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        {t("fm.org.supportContext", "Support context: {{name}}", {
          name: supportOrg.name,
        })}
      </div>
    );
  }, [supportOrg, t]);

  return {
    hasOrgContext,
    orgId: effectiveOrgId,
    supportOrg,
    canImpersonate,
    loading,
    guard,
    supportBanner,
  };
}

"use client";

import React from "react";
import { useFmOrgGuard } from "./useFmOrgGuard";
import type { ModuleId } from "@/config/navigation";

type GuardContext = ReturnType<typeof useFmOrgGuard>;

/**
 * Guaranteed context type passed to children.
 * orgId is guaranteed to be a non-null string when children render.
 */
export type GuaranteedFmContext = Omit<GuardContext, "orgId"> & {
  orgId: string;
};

type GuardRender = (ctx: GuaranteedFmContext) => React.ReactNode;

type FmGuardedPageProps = {
  moduleId: ModuleId;
  children: GuardRender;
};

/**
 * Renders the FM page only when org context is available.
 * Keeps hooks inside children unconditional, so we can avoid eslint rule-of-hooks waivers.
 * Children receive GuaranteedFmContext with non-null orgId, eliminating need for assertions.
 */
export function FmGuardedPage({ moduleId, children }: FmGuardedPageProps) {
  const guardCtx = useFmOrgGuard({ moduleId });

  if (!guardCtx.hasOrgContext || !guardCtx.orgId) {
    return guardCtx.guard;
  }

  // Type assertion is safe: we've verified orgId is non-null in the guard above
  // Create new object with explicit type to ensure proper type narrowing
  const guaranteedCtx: GuaranteedFmContext = {
    hasOrgContext: guardCtx.hasOrgContext,
    orgId: guardCtx.orgId!, // Non-null assertion safe due to guard check above
    supportOrg: guardCtx.supportOrg,
    canImpersonate: guardCtx.canImpersonate,
    loading: guardCtx.loading,
    guard: guardCtx.guard,
    supportBanner: guardCtx.supportBanner,
  };

  return <>{children(guaranteedCtx)}</>;
}

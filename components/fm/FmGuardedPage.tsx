'use client';

import React from 'react';
import { useFmOrgGuard } from './useFmOrgGuard';
import type { ModuleId } from '@/config/navigation';

type GuardContext = ReturnType<typeof useFmOrgGuard>;
type GuardedContext = GuardContext & { orgId: string };

type GuardRender = (ctx: GuardedContext) => React.ReactNode;

type FmGuardedPageProps = {
  moduleId: ModuleId;
  children: GuardRender;
};

/**
 * Renders the FM page only when org context is available.
 * Keeps hooks inside children unconditional, so we can avoid eslint rule-of-hooks waivers.
 * Type-narrows orgId to string (non-undefined) after guard check.
 */
export function FmGuardedPage({ moduleId, children }: FmGuardedPageProps) {
  const guardCtx = useFmOrgGuard({ moduleId });

  if (!guardCtx.hasOrgContext || !guardCtx.orgId) {
    return guardCtx.guard;
  }

  // Type assertion is safe here because we've checked orgId exists
  return <>{children(guardCtx as GuardedContext)}</>;
}

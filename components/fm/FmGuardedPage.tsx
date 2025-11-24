'use client';

import React from 'react';
import { useFmOrgGuard } from './useFmOrgGuard';
import type { ModuleId } from '@/config/navigation';

// Type that guarantees orgId is non-null
type FmGuardedContext = Omit<ReturnType<typeof useFmOrgGuard>, 'orgId'> & {
  orgId: string;
};

type GuardRender = (ctx: FmGuardedContext) => React.ReactNode;

type FmGuardedPageProps = {
  moduleId: ModuleId;
  children: GuardRender;
};

/**
 * Renders the FM page only when org context is available.
 * Keeps hooks inside children unconditional, so we can avoid eslint rule-of-hooks waivers.
 * Guarantees orgId is non-null when children are rendered.
 */
export function FmGuardedPage({ moduleId, children }: FmGuardedPageProps) {
  const guardCtx = useFmOrgGuard({ moduleId });

  if (!guardCtx.hasOrgContext || !guardCtx.orgId) {
    return guardCtx.guard;
  }

  // Type assertion is safe here because we've checked orgId is non-null above
  return <>{children(guardCtx as FmGuardedContext)}</>;
}

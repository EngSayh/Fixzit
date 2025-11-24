'use client';

import React from 'react';
import { useFmOrgGuard } from './useFmOrgGuard';
import type { ModuleId } from '@/config/navigation';

// Narrowed type when org context is guaranteed to be available
type GuardedContext = Omit<ReturnType<typeof useFmOrgGuard>, 'orgId'> & {
  orgId: string; // Non-nullable when rendered
};

type GuardRender = (ctx: GuardedContext) => React.ReactNode;

type FmGuardedPageProps = {
  moduleId: ModuleId;
  children: GuardRender;
};

/**
 * Renders the FM page only when org context is available.
 * Keeps hooks inside children unconditional, so we can avoid eslint rule-of-hooks waivers.
 * 
 * Type safety: orgId is guaranteed non-null when children render (checked in if condition).
 * Children receive GuardedContext with orgId: string (not string | null).
 */
export function FmGuardedPage({ moduleId, children }: FmGuardedPageProps) {
  const guardCtx = useFmOrgGuard({ moduleId });

  if (!guardCtx.hasOrgContext || !guardCtx.orgId) {
    return guardCtx.guard;
  }

  // Type assertion is safe here: we've verified orgId is non-null above
  return <>{children(guardCtx as GuardedContext)}</>;
}

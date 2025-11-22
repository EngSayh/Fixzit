'use client';

import React from 'react';
import { useFmOrgGuard } from './useFmOrgGuard';
import type { ModuleId } from '@/config/navigation';

type GuardRender = (ctx: ReturnType<typeof useFmOrgGuard>) => React.ReactNode;

type FmGuardedPageProps = {
  moduleId: ModuleId;
  children: GuardRender;
};

/**
 * Renders the FM page only when org context is available.
 * Keeps hooks inside children unconditional, so we can avoid eslint rule-of-hooks waivers.
 */
export function FmGuardedPage({ moduleId, children }: FmGuardedPageProps) {
  const guardCtx = useFmOrgGuard({ moduleId });

  if (!guardCtx.hasOrgContext || !guardCtx.orgId) {
    return guardCtx.guard;
  }

  return <>{children(guardCtx)}</>;
}

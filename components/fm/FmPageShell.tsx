'use client';

import React from 'react';
import { FmGuardedPage } from './FmGuardedPage';
import type { ModuleId } from '@/config/navigation';
import type { ReactNode } from 'react';

type GuardContext = {
  orgId: string;
  supportBanner?: ReactNode | null;
  hasOrgContext: boolean;
  loading: boolean;
};

type FmPageShellProps = {
  moduleId: ModuleId;
  children: (ctx: GuardContext) => ReactNode;
};

/**
 * Thin wrapper around FmGuardedPage to encourage a consistent pattern:
 * - Wrapper handles guard/redirect.
 * - Inner render function receives orgId/supportBanner and can keep hooks unconditional.
 */
export function FmPageShell({ moduleId, children }: FmPageShellProps) {
  return (
    <FmGuardedPage moduleId={moduleId}>
      {(ctx) =>
        children({
          orgId: ctx.orgId!,
          supportBanner: ctx.supportBanner,
          hasOrgContext: ctx.hasOrgContext,
          loading: ctx.loading,
        })
      }
    </FmGuardedPage>
  );
}

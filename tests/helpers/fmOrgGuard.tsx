import React from "react";

type OrgGuardState = {
  hasOrgContext: boolean;
  orgId: string | null;
  guard: React.ReactNode;
  supportBanner?: React.ReactNode;
};

/**
 * FM Org Guard test helper: provides a consistent mock return shape for useFmOrgGuard.
 */
export function buildFmOrgGuardState(
  overrides: Partial<OrgGuardState> = {},
): OrgGuardState {
  return {
    hasOrgContext: true,
    orgId: "org-test",
    guard: null,
    supportBanner: <div data-testid="support-banner">banner</div>,
    ...overrides,
  };
}

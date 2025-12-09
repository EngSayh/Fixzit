'use client';
"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import type { QuickActionConfig } from "@/config/topbar-modules";
import type { UserRoleType } from "@/types/user";

export function usePermittedQuickActions(actions: QuickActionConfig[]) {
  const { data } = useSession();
  const role = (data?.user as { role?: UserRoleType } | undefined)?.role;

  return useMemo(() => {
    if (!Array.isArray(actions) || actions.length === 0) {
      return [];
    }
    if (!role) {
      return actions.filter(
        (action) => !action.roles || action.roles.length === 0,
      );
    }
    return actions.filter((action) => {
      if (!action.roles || action.roles.length === 0) return true;
      return action.roles.includes(role);
    });
  }, [actions, role]);
}

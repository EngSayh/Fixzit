/**
 * CurrentOrgContext
 *
 * Provides organization context for the currently authenticated user.
 * Used for plan-based feature gating and multi-tenancy checks.
 */

"use client";

import React, { createContext, useContext, useMemo, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { Plan } from "@/domain/fm/fm-lite";

export interface Organization {
  id: string;
  name?: string;
  plan: Plan;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CurrentOrgContextValue {
  org: Organization | null;
  isLoading: boolean;
}

const CurrentOrgContext = createContext<CurrentOrgContextValue | undefined>(
  undefined,
);

export const useCurrentOrg = (): CurrentOrgContextValue => {
  const ctx = useContext(CurrentOrgContext);
  if (!ctx) {
    throw new Error("useCurrentOrg must be used within a CurrentOrgProvider");
  }
  return ctx;
};

interface CurrentOrgProviderProps {
  children: ReactNode;
}

/**
 * Provider that derives organization context from the user's session.
 *
 * In the future, this can be enhanced to fetch org details from an API.
 * For now, it derives plan from the session user's orgPlan field.
 */
export function CurrentOrgProvider({ children }: CurrentOrgProviderProps) {
  const { data: session, status } = useSession();

  const value = useMemo<CurrentOrgContextValue>(() => {
    const isLoading = status === "loading";

    if (!session?.user?.orgId) {
      return { org: null, isLoading };
    }

    // Extract plan from session, default to STARTER for fail-safe security
    const user = session.user as {
      id: string;
      orgId?: string;
      orgPlan?: string;
      role?: string;
    };

    const planString = user.orgPlan || "STARTER";
    const plan = (Plan[planString as keyof typeof Plan] ||
      Plan.STARTER) as Plan;

    const org: Organization = {
      id: user.orgId!,
      plan,
    };

    return { org, isLoading };
  }, [session, status]);

  return (
    <CurrentOrgContext.Provider value={value}>
      {children}
    </CurrentOrgContext.Provider>
  );
}

export default CurrentOrgContext;

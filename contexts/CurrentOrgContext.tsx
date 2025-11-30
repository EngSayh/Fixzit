/**
 * CurrentOrgContext
 *
 * Provides organization context for the currently authenticated user.
 * Used for plan-based feature gating and multi-tenancy checks.
 * 
 * 🟢 FIX: Case-insensitive plan parsing to prevent entitlement downgrades
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
 * Normalize plan string to Plan enum (case-insensitive).
 * Handles variations like "Pro", "PRO", "pro" → Plan.PRO
 * Falls back to STARTER for safety if unrecognized.
 */
function normalizePlan(planString?: string | null): Plan {
  if (!planString) return Plan.STARTER;
  
  const normalizedKey = planString.toUpperCase().trim();
  
  // Direct enum lookup
  if (normalizedKey in Plan) {
    return Plan[normalizedKey as keyof typeof Plan];
  }
  
  // Handle common variations
  switch (normalizedKey) {
    case "STARTER":
    case "FREE":
    case "BASIC":
      return Plan.STARTER;
    case "STANDARD":
    case "STD":
      return Plan.STANDARD;
    case "PRO":
    case "PROFESSIONAL":
    case "PREMIUM":
      return Plan.PRO;
    case "ENTERPRISE":
    case "ENT":
    case "BUSINESS":
      return Plan.ENTERPRISE;
    default:
      // CTX-001 FIX: Log warning for unknown plan before defaulting to STARTER
      // This helps debug plan misconfigurations in production
      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-console -- Intentional: debugging plan misconfigurations
        console.warn(
          `[CurrentOrgContext] Unknown plan "${planString}" received, defaulting to STARTER. ` +
          `Expected one of: STARTER, STANDARD, PRO, ENTERPRISE`
        );
      }
      return Plan.STARTER;
  }
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

    // 🟢 FIX: Case-insensitive plan normalization
    const plan = normalizePlan(user.orgPlan);

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

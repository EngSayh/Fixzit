"use client";

import { useSession } from "next-auth/react";
import type { AuthSession, ExtendedUser } from "@/types/auth-session";
export type { AuthSession } from "@/types/auth-session";

/**
 * Hook to get current authenticated session
 * @returns AuthSession or null if not authenticated
 */
export function useAuthSession(): AuthSession | null {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return null;
  }

  if (!session?.user) {
    return null;
  }

  const user = session.user as ExtendedUser;

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role || "GUEST",
    orgId: user.orgId || null, // Organization ID for tenant isolation
    tenantId: user.tenantId || null, // Use null instead of empty string
    sellerId: user.sellerId,
    isAuthenticated: true,
  };
}

// NOTE: getServerAuthSession has been moved to hooks/useAuthSession.server.ts
// to prevent ioredis from being bundled into client components.
// Import it from there for Server Components and API routes.

"use client";

import { useEffect } from "react";
import { autoFixManager } from "@/lib/AutoFixManager";
import { useSession } from "next-auth/react";
import { UserRole } from "@/types/user";

/**
 * AutoFixInitializer Component
 *
 * Initializes the auto-fix system when the application starts.
 * This component:
 * - Starts automated health monitoring with 5-minute intervals
 * - Runs an initial health check on mount
 * - Properly cleans up monitoring on unmount
 *
 * The auto-fix system proactively monitors:
 * - Database connectivity
 * - API health endpoints
 * - Critical service availability
 * - And automatically attempts fixes for common issues
 *
 * @component
 * @example
 * // Used in ClientLayout.tsx
 * <AutoFixInitializer />
 */
export default function AutoFixInitializer() {
  const { status, data: session } = useSession();

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) {
      // Reset auth state when not authenticated
      autoFixManager.setAuthState(false, false);
      autoFixManager.stopAutoMonitoring();
      return;
    }

    const isSuperAdmin =
      session.user.role === UserRole.SUPER_ADMIN ||
      (session.user as { isSuperAdmin?: boolean }).isSuperAdmin === true;

    // Set auth state so manager knows which checks to run
    autoFixManager.setAuthState(true, isSuperAdmin);

    if (!isSuperAdmin) {
      autoFixManager.stopAutoMonitoring();
      return;
    }

    // Start auto-monitoring with 5-minute intervals
    autoFixManager.startAutoMonitoring(5);

    // Run initial health check
    autoFixManager.runHealthCheck().catch(() => {
      // Health check failed - auto-fix manager will handle internally
    });

    // Cleanup on unmount
    return () => {
      autoFixManager.stopAutoMonitoring();
    };
  }, [status, session?.user?.id, session?.user?.role, session?.user?.isSuperAdmin]);

  // This component doesn't render anything
  return null;
}

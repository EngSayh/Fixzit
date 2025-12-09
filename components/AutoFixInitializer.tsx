"use client";

import { useEffect } from "react";
import { autoFixManager } from "@/lib/AutoFixManager";

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
  useEffect(() => {
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
  }, []);

  // This component doesn't render anything
  return null;
}

/**
 * @fileoverview Shared test utilities for security monitoring tests
 * 
 * This module provides standardized patterns for resetting monitoring state
 * in tests, with built-in enforcement to prevent silent test contamination.
 * 
 * WHY THIS EXISTS:
 * The security monitoring module uses process-global Maps to track events.
 * Without proper reset between tests:
 * - Tests become order-dependent
 * - Cross-suite contamination causes flaky CI failures
 * - Debugging becomes extremely difficult
 * 
 * USAGE:
 * ```typescript
 * import { setupMonitoringTestIsolation } from "@/tests/utils/monitoring-test-utils";
 * 
 * describe("My Monitoring Tests", () => {
 *   setupMonitoringTestIsolation();
 *   // ... your tests
 * });
 * ```
 */

import { beforeEach, afterEach } from "vitest";

// Dynamic import to avoid circular dependencies and allow runtime checks
let resetHelper: (() => void) | null = null;

/**
 * Validates that the monitoring reset helper exists and is callable.
 * Throws immediately if the helper is missing, preventing silent test failures.
 * 
 * @throws Error if __resetMonitoringStateForTests is not exported or not a function
 */
export async function validateMonitoringResetHelper(): Promise<void> {
  try {
    const monitoring = await import("@/lib/security/monitoring");
    
    if (typeof monitoring.__resetMonitoringStateForTests !== "function") {
      throw new Error(
        "[Test Setup Error] __resetMonitoringStateForTests is not a function.\n" +
        "The monitoring module must export a test-only reset helper.\n" +
        "This is required for test isolation. See lib/security/monitoring.ts"
      );
    }
    
    resetHelper = monitoring.__resetMonitoringStateForTests;
  } catch (error) {
    if (error instanceof Error && error.message.includes("Test Setup Error")) {
      throw error;
    }
    throw new Error(
      "[Test Setup Error] Failed to import monitoring module.\n" +
      "Cannot validate reset helper exists.\n" +
      `Original error: ${error instanceof Error ? error.message : error}`
    );
  }
}

/**
 * Resets monitoring state with validation.
 * Call this in beforeEach() to ensure clean state for each test.
 * 
 * @throws Error if reset helper is not available
 */
export function resetMonitoringState(): void {
  if (typeof resetHelper !== "function") {
    throw new Error(
      "[Test Runtime Error] Monitoring reset helper not initialized.\n" +
      "Call validateMonitoringResetHelper() or setupMonitoringTestIsolation() first."
    );
  }
  
  resetHelper();
}

/**
 * Sets up complete test isolation for monitoring tests.
 * 
 * This function:
 * 1. Validates the reset helper exists (fails fast if missing)
 * 2. Registers beforeEach to reset state before every test
 * 3. VERIFIES reset actually cleared state (catches no-op regressions)
 * 4. Registers afterEach to reset and verify cleanliness after each test
 * 
 * @example
 * ```typescript
 * describe("Security Monitoring", () => {
 *   setupMonitoringTestIsolation();
 *   
 *   it("should track events", () => {
 *     // State is guaranteed clean here
 *   });
 * });
 * ```
 */
export function setupMonitoringTestIsolation(): void {
  // Synchronously import and validate at setup time
  // This ensures failures happen during test setup, not during test execution
  beforeEach(async () => {
    // Lazy initialization on first test
    if (resetHelper === null) {
      await validateMonitoringResetHelper();
    }
    
    // Reset state before each test
    resetMonitoringState();
    
    // CRITICAL: Verify reset actually cleared state
    // This catches regressions where reset becomes a no-op
    await assertMonitoringStateClean();
  });
  
  // Reset after each test AND verify cleanliness
  // This catches tests that leak state (forget to clean up)
  afterEach(async () => {
    if (resetHelper !== null) {
      resetHelper();
      // Verify the reset worked - catches no-op regressions
      await assertMonitoringStateClean();
    }
  });
}

/**
 * Asserts that monitoring state is clean (all counters at zero).
 * Useful for verifying reset worked correctly.
 * 
 * @throws Error if any counter is non-zero
 */
export async function assertMonitoringStateClean(): Promise<void> {
  const { getSecurityMetrics } = await import("@/lib/security/monitoring");
  const metrics = getSecurityMetrics();
  
  const issues: string[] = [];
  
  if (metrics.rateLimitHits !== 0) {
    issues.push(`rateLimitHits: expected 0, got ${metrics.rateLimitHits}`);
  }
  if (metrics.corsViolations !== 0) {
    issues.push(`corsViolations: expected 0, got ${metrics.corsViolations}`);
  }
  if (metrics.authFailures !== 0) {
    issues.push(`authFailures: expected 0, got ${metrics.authFailures}`);
  }
  if (metrics.rateLimitUniqueKeys !== 0) {
    issues.push(`rateLimitUniqueKeys: expected 0, got ${metrics.rateLimitUniqueKeys}`);
  }
  if (metrics.corsUniqueKeys !== 0) {
    issues.push(`corsUniqueKeys: expected 0, got ${metrics.corsUniqueKeys}`);
  }
  if (metrics.authUniqueKeys !== 0) {
    issues.push(`authUniqueKeys: expected 0, got ${metrics.authUniqueKeys}`);
  }
  
  if (issues.length > 0) {
    throw new Error(
      "[Test Isolation Error] Monitoring state is not clean:\n" +
      issues.map(i => `  - ${i}`).join("\n") +
      "\n\nThis indicates state leaked between tests. Check beforeEach reset."
    );
  }
}

/**
 * Shared rate limit mock helper
 * Provides consistent rate limit bypass for tests
 */
import { vi } from "vitest";

export let mockRateLimitResult: { success: boolean; reason?: string } = { success: true };

/**
 * Create rate limit mock factory
 * Usage:
 * ```ts
 * import { createRateLimitMock, setRateLimitResult, resetRateLimitMock } from '@/tests/helpers/mockRateLimit';
 * 
 * vi.mock("@/lib/rate-limit", createRateLimitMock);
 * 
 * beforeEach(() => {
 *   resetRateLimitMock();
 * });
 * 
 * test("rate limited", () => {
 *   setRateLimitResult({ success: false, reason: "Too many requests" });
 *   // ...
 * });
 * ```
 */
export const createRateLimitMock = () => ({
  enforceRateLimit: vi.fn(async () => mockRateLimitResult),
});

/**
 * Set rate limit result for current test
 */
export const setRateLimitResult = (result: { success: boolean; reason?: string }) => {
  mockRateLimitResult = result;
};

/**
 * Reset to default (success: true)
 */
export const resetRateLimitMock = () => {
  mockRateLimitResult = { success: true };
  vi.clearAllMocks();
};

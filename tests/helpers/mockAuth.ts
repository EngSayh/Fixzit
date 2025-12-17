/**
 * Shared auth mock helper - runtime state pattern
 * Eliminates mockResolvedValue race conditions and hoisting issues
 */
import { vi } from "vitest";

export type MockUser = {
  id: string;
  orgId?: string;
  role?: string;
  email?: string;
};

export let mockSessionUser: MockUser | null = null;

/**
 * Create auth mock factory
 * Usage in test file:
 * ```ts
 * import { createAuthMock, mockSessionUser, setMockUser, clearMockUser } from '@/tests/helpers/mockAuth';
 * 
 * vi.mock("@/auth", createAuthMock);
 * 
 * beforeEach(() => {
 *   clearMockUser();
 * });
 * 
 * test("authenticated", () => {
 *   setMockUser({ id: "123", orgId: "456" });
 *   // ...
 * });
 * ```
 */
export const createAuthMock = () => ({
  auth: vi.fn(async () => {
    if (!mockSessionUser) return null;
    return { user: mockSessionUser };
  }),
});

/**
 * Set mock user for current test
 */
export const setMockUser = (user: MockUser | null) => {
  mockSessionUser = user;
};

/**
 * Clear mock user (call in beforeEach)
 */
export const clearMockUser = () => {
  mockSessionUser = null;
};

/**
 * Reset all mocks (call in beforeEach)
 */
export const resetAuthMock = () => {
  clearMockUser();
  vi.clearAllMocks();
};

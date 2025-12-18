/**
 * Common session/context test helper for API routes
 * Reduces 401/500 noise and standardizes auth mocking
 * 
 * @module tests/helpers/session
 */

import { vi } from "vitest";

export type MockSession = {
  userId: string;
  orgId: string;
  role: string;
  email?: string;
  name?: string;
};

const DEFAULT_SESSION: MockSession = {
  userId: "test_user_123",
  orgId: "test_org_456",
  role: "ADMIN",
  email: "test@example.com",
  name: "Test User",
};

/**
 * Create a mock session for API route tests
 * @param overrides - Partial session to override defaults
 * @returns Mock session object
 */
export function createMockSession(overrides?: Partial<MockSession>): MockSession {
  return { ...DEFAULT_SESSION, ...overrides };
}

/**
 * Mock getSessionUser for API route tests
 * Use in beforeEach to ensure consistent auth mocking
 * 
 * @example
 * ```ts
 * beforeEach(() => {
 *   mockSessionUser({ role: "FM_MANAGER" });
 * });
 * ```
 */
export function mockSessionUser(session?: Partial<MockSession>) {
  const mockSession = createMockSession(session);
  
  // Mock the auth middleware module
  vi.mock("@/server/middleware/withAuthRequired", () => ({
    getSessionUser: vi.fn().mockResolvedValue(mockSession),
    UnauthorizedError: class UnauthorizedError extends Error {
      constructor(message = "Unauthorized") {
        super(message);
        this.name = "UnauthorizedError";
      }
    },
  }));
  
  return mockSession;
}

/**
 * Mock marketplace context for Souq API routes
 */
export function mockMarketplaceContext(overrides?: Partial<MockSession>) {
  const mockSession = createMockSession(overrides);
  
  vi.mock("@/server/marketplace/context", () => ({
    resolveMarketplaceContext: vi.fn().mockResolvedValue({
      userId: mockSession.userId,
      orgId: mockSession.orgId,
      role: mockSession.role,
    }),
  }));
  
  return mockSession;
}

/**
 * Mock unauthenticated request (401 scenario)
 */
export function mockUnauthenticated() {
  vi.mock("@/server/middleware/withAuthRequired", () => ({
    getSessionUser: vi.fn().mockRejectedValue(new Error("Unauthorized")),
    UnauthorizedError: class UnauthorizedError extends Error {
      constructor(message = "Unauthorized") {
        super(message);
        this.name = "UnauthorizedError";
      }
    },
  }));
}

/**
 * Clear all session mocks
 * Use in afterEach to clean up
 */
export function clearSessionMocks() {
  vi.clearAllMocks();
  vi.resetModules();
}

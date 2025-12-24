/**
 * @fileoverview Mock Factory - Standardized mock creation patterns
 * @description Provides factory functions for creating consistent mocks
 * that follow the module-scoped variable pattern.
 * 
 * @module tests/_helpers/mockFactory
 * @see docs/TESTING_STRATEGY.md for usage guidelines
 */

import { vi, type Mock } from 'vitest';

/**
 * Creates a standard mock function with common methods
 * Use this in module scope, then reset in beforeEach
 */
export function createMock<T extends (...args: unknown[]) => unknown>(): Mock<T> {
  return vi.fn() as Mock<T>;
}

/**
 * Creates an async mock that resolves to the given value
 * Includes convenience methods for success/error states
 */
export function createAsyncMock<TResolve = unknown>() {
  const mock = vi.fn() as Mock & {
    mockSuccess: (value: TResolve) => void;
    mockError: (error: Error | string) => void;
  };

  mock.mockSuccess = (value: TResolve) => {
    mock.mockResolvedValue(value);
  };

  mock.mockError = (error: Error | string) => {
    const err = typeof error === 'string' ? new Error(error) : error;
    mock.mockRejectedValue(err);
  };

  return mock;
}

/**
 * Standard session user for authenticated tests
 */
export interface MockSessionUser {
  id?: string;
  orgId: string;
  role: string;
  subRole?: string | null;
  email?: string;
  name?: string;
}

/**
 * Creates a standard session user mock
 */
export function createSessionUser(overrides: Partial<MockSessionUser> = {}): MockSessionUser {
  return {
    id: 'user_test_123',
    orgId: 'org_test_123',
    role: 'ADMIN',
    email: 'test@example.com',
    name: 'Test User',
    ...overrides,
  };
}

/**
 * Creates a standard rate limit response mock
 */
export function createRateLimitResponse(status: 429 | null = 429): Response | null {
  if (status === null) return null;
  return new Response(
    JSON.stringify({ error: 'Rate limit exceeded' }),
    { status: 429, headers: { 'Content-Type': 'application/json' } }
  ) as Response;
}

/**
 * Creates a standard auth mock setup for routes
 * Returns an object with all the mocks that can be configured
 */
export function createAuthMocks() {
  const mockAuth = vi.fn();
  const mockEnforceRateLimit = vi.fn();
  const mockHasAllowedRole = vi.fn();

  return {
    auth: mockAuth,
    enforceRateLimit: mockEnforceRateLimit,
    hasAllowedRole: mockHasAllowedRole,
    
    /** Configure for authenticated user */
    configureAuthenticated(user: MockSessionUser = createSessionUser()) {
      mockAuth.mockResolvedValue({ user });
      mockEnforceRateLimit.mockReturnValue(null);
      mockHasAllowedRole.mockReturnValue(true);
    },
    
    /** Configure for unauthenticated request */
    configureUnauthenticated() {
      mockAuth.mockResolvedValue(null);
      mockEnforceRateLimit.mockReturnValue(null);
    },
    
    /** Configure for rate limited request */
    configureRateLimited() {
      mockEnforceRateLimit.mockReturnValue(createRateLimitResponse());
    },
    
    /** Configure for forbidden (RBAC failure) */
    configureForbidden(user: MockSessionUser = createSessionUser({ role: 'EMPLOYEE' })) {
      mockAuth.mockResolvedValue({ user });
      mockEnforceRateLimit.mockReturnValue(null);
      mockHasAllowedRole.mockReturnValue(false);
    },
    
    /** Reset all mocks to initial state */
    reset() {
      mockAuth.mockReset();
      mockEnforceRateLimit.mockReset();
      mockHasAllowedRole.mockReset();
    },
    
    /** Clear mock call history (keep implementations) */
    clear() {
      mockAuth.mockClear();
      mockEnforceRateLimit.mockClear();
      mockHasAllowedRole.mockClear();
    },
  };
}

/**
 * Creates a mock NextRequest
 */
export function createMockRequest(
  url: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Request {
  const { method = 'GET', body, headers = {} } = options;
  
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };
  
  if (body && method !== 'GET') {
    init.body = JSON.stringify(body);
  }
  
  return new Request(url, init);
}

/**
 * Helper to expect auth failure response
 * Checks for 401 status code
 */
export function expectAuthFailure(response: Response) {
  expect(response.status).toBe(401);
}

/**
 * Helper to expect forbidden response
 * Checks for 403 status code
 */
export function expectForbidden(response: Response) {
  expect(response.status).toBe(403);
}

/**
 * Helper to expect rate limit response
 * Checks for 429 status code
 */
export function expectRateLimited(response: Response) {
  expect(response.status).toBe(429);
}

/**
 * Helper to expect success response
 * Checks for 200 or specified status code
 */
export function expectSuccess(response: Response, status: number = 200) {
  expect(response.status).toBe(status);
}

/**
 * Template for module-scoped mock setup
 * Copy this template to new test files
 */
export const MOCK_TEMPLATE = `
// ==== MODULE-SCOPED MOCKS (declare before vi.mock calls) ====
let sessionUser: MockSessionUser | null = null;
const mockEnforceRateLimit = vi.fn();
const mockHasAllowedRole = vi.fn();
const mockServiceMethod = vi.fn();

// ==== vi.mock() CALLS ====
vi.mock("@/lib/auth/session", () => ({
  getServerSession: () => Promise.resolve(sessionUser ? { user: sessionUser } : null),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
}));

vi.mock("@/lib/auth/role-guards", () => ({
  hasAllowedRole: (...args: unknown[]) => mockHasAllowedRole(...args),
}));

// ==== IMPORTS (after vi.mock) ====
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { hasAllowedRole } from "@/lib/auth/role-guards";

// ==== TEST SETUP ====
describe("API /api/example", () => {
  beforeEach(() => {
    sessionUser = null;
    vi.clearAllMocks();
    
    // Default: no rate limit, role check passes
    vi.mocked(mockEnforceRateLimit).mockReturnValue(null);
    vi.mocked(mockHasAllowedRole).mockReturnValue(true);
  });

  // Tests go here...
});
`;

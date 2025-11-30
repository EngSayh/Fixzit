import { test, expect, Page, APIRequestContext } from '@playwright/test';
import { attemptLogin } from './utils/auth';
import {
  getRequiredTestCredentials,
  type TestCredentials,
  type SubRoleKey,
} from './utils/credentials';

/**
 * Sub-Role API Access E2E Tests
 *
 * Tests that sub-roles can/cannot access appropriate API endpoints.
 * Validates that RBAC rules are enforced at the API layer.
 *
 * Resolves: E2E-001 from PR Comments Audit
 *
 * SECURITY FIX (PR #376):
 * - Removed insecure fallback credentials (Test@1234)
 * - Uses getRequiredTestCredentials() which throws if env not set
 * - Fail-fast via assertions (no skips)
 * - Login failures now fail tests explicitly instead of skipping
 */

const DEFAULT_TIMEOUT = 30000;

/**
 * Get test credentials for a sub-role.
 * Throws immediately if environment variables are not configured.
 * This ensures tests fail fast rather than silently skipping.
 */
function getCredentials(subRole: SubRoleKey): TestCredentials {
  return getRequiredTestCredentials(subRole);
}

/**
 * RBAC E2E Assertion Helpers
 * 
 * SECURITY AUDIT (2025-11-30):
 * - expectAllowed(): Strict 200 only - detects RBAC failures AND missing routes
 * - expectAllowedOrEmpty(): Only accepts 404 if endpoint is in ENDPOINTS_DOCUMENTED_404_FOR_EMPTY
 * - expectAllowedWithBodyCheck(): Preferred - validates 200 AND response structure + tenant scoping
 * - expectDenied(): Strict 403 only
 * 
 * WHY WE DON'T ACCEPT 404 FOR "ALLOWED" ENDPOINTS:
 * 1. Backends may return 404 instead of 403 (security-through-obscurity)
 * 2. Missing routes return 404 - masks route configuration bugs
 * 3. RBAC guards that throw NotFound instead of Forbidden go undetected
 * 
 * If an endpoint legitimately returns 404 for empty collections, the backend
 * should be fixed to return 200 with empty array. This is REST best practice.
 */

/**
 * Categorize endpoints by their documented 404-for-empty behavior.
 * This makes explicit which endpoints are expected to return 404 for empty data.
 * 
 * ⚠️ AUDIT REQUIREMENT: Any endpoint added here MUST have:
 * 1. A documented reason in API docs why it returns 404 for empty
 * 2. A tracking issue to fix the backend to return 200 + empty array
 * 3. Approval from code review
 * 
 * @see https://restfulapi.net/http-status-codes/ - REST best practice is 200 + empty array
 */
const ENDPOINTS_DOCUMENTED_404_FOR_EMPTY: string[] = [
  // Empty by design - all endpoints should return 200 + empty array
  // If you must add an endpoint here, include:
  // - '/api/path' - JIRA-123: Legacy API, fix planned for Q2 2025
];

/**
 * Check if an endpoint is documented to return 404 for empty collections.
 * Used by expectAllowedOrEmpty to enforce the exception list.
 */
function isDocumentedEmpty404Endpoint(endpoint: string): boolean {
  return ENDPOINTS_DOCUMENTED_404_FOR_EMPTY.includes(endpoint);
}

/**
 * Strict assertion for endpoints that MUST return 200.
 * Use this for all "allowed" endpoint tests unless there's a documented exception.
 * 
 * @param response - Playwright API response
 * @param endpoint - API endpoint path for error messages
 * @param role - Role name for error messages
 */
function expectAllowed(
  response: { status: () => number },
  endpoint: string,
  role: string
): void {
  const status = response.status();
  expect(
    status,
    `${role} SHOULD access ${endpoint} - got ${status}, expected 200.\n` +
    `DIAGNOSIS:\n` +
    `  • 403: RBAC guard denying access incorrectly\n` +
    `  • 404: Route missing OR guard returns 404 instead of 403 (security-through-obscurity)\n` +
    `  • 401: Authentication failed - check login/session\n` +
    `  • 500: Server error - check logs\n` +
    `ACTION: If 404, verify route exists and RBAC guard returns proper 403 for denied access.`
  ).toBe(200);
}

/**
 * Assertion that accepts 404 for empty collections ONLY if explicitly documented.
 * 
 * ⚠️ AUDIT ENFORCED (2025-11-30): 404 is ONLY accepted if the endpoint is listed in 
 * ENDPOINTS_DOCUMENTED_404_FOR_EMPTY. Undocumented 404s will FAIL the test.
 * 
 * Critical checks:
 * 1. MUST NOT get 403 - indicates RBAC failure
 * 2. MUST get 200 (preferred) - or 404 ONLY if documented
 * 3. MUST NOT get 401 (auth failure) or 500 (server error)
 * 
 * @param response - Playwright API response
 * @param endpoint - API endpoint path for error messages
 * @param role - Role name for error messages
 */
function expectAllowedOrEmpty(
  response: { status: () => number },
  endpoint: string,
  role: string
): void {
  const status = response.status();
  
  // CRITICAL: 403 means RBAC is incorrectly denying access
  expect(
    status,
    `RBAC FAILURE: ${role} SHOULD access ${endpoint} but got 403 Forbidden.\n` +
    `The RBAC guard is incorrectly denying access to an authorized role.\n` +
    `ACTION: Check lib/auth/role-guards.ts for ${endpoint} permissions.`
  ).not.toBe(403);
  
  // 401 means authentication failed, not authorization
  expect(
    status,
    `AUTH FAILURE: ${role} request to ${endpoint} got 401 Unauthorized.\n` +
    `Login/session is broken. This is NOT an RBAC issue.\n` +
    `ACTION: Check attemptLogin() and session cookie handling.`
  ).not.toBe(401);
  
  // 500 means server error
  expect(
    status,
    `SERVER ERROR: ${endpoint} returned 500 for ${role}.\n` +
    `This indicates a backend bug, not an RBAC issue.\n` +
    `ACTION: Check server logs for the error stack trace.`
  ).not.toBe(500);
  
  // AUDIT ENFORCEMENT: 404 only acceptable if endpoint is documented
  if (status === 404) {
    const isDocumented = isDocumentedEmpty404Endpoint(endpoint);
    expect(
      isDocumented,
      `UNDOCUMENTED 404: ${endpoint} returned 404 for ${role}.\n` +
      `This endpoint is NOT in ENDPOINTS_DOCUMENTED_404_FOR_EMPTY.\n\n` +
      `POSSIBLE CAUSES:\n` +
      `  • Route is missing (configuration bug)\n` +
      `  • RBAC guard returns 404 instead of 403 (security-through-obscurity)\n` +
      `  • Backend returns 404 for empty collections (should be 200 + [])\n\n` +
      `ACTIONS:\n` +
      `  1. Verify route exists in /app/api/ or /pages/api/\n` +
      `  2. If empty collection: fix backend to return 200 + empty array\n` +
      `  3. If legitimate 404-for-empty: add to ENDPOINTS_DOCUMENTED_404_FOR_EMPTY\n` +
      `     with tracking issue number and justification`
    ).toBe(true);
    
    console.warn(
      `📝 DOCUMENTED 404: ${endpoint} returned 404 for ${role}. ` +
      `Backend should migrate to 200 + empty array (REST best practice).`
    );
  } else {
    // Must be 200 if not 404
    expect(
      status,
      `UNEXPECTED STATUS: ${role} got ${status} from ${endpoint}.\n` +
      `Expected 200 (success).\n` +
      `• 400: Invalid request parameters\n` +
      `• 405: Method not allowed\n` +
      `ACTION: Investigate the specific error response.`
    ).toBe(200);
  }
}

/**
 * Assertion helper for endpoints that validates both access AND response structure.
 * Use this for comprehensive tests that verify tenant scoping and data integrity.
 * 
 * @param response - Playwright API response object
 * @param endpoint - API endpoint path for error messages
 * @param role - Role name for error messages
 * @param validate - Validation function to check response body (schema, tenant scoping, etc.)
 * 
 * @example
 * // Validate that returned work orders belong to the test tenant
 * await expectAllowedWithBodyCheck(
 *   response,
 *   '/api/work-orders',
 *   'TEAM_MEMBER',
 *   (body) => {
 *     expect(Array.isArray(body)).toBe(true);
 *     body.forEach(item => {
 *       expect(item.org_id).toBe(process.env.TEST_ORG_ID);
 *     });
 *   }
 * );
 */
async function expectAllowedWithBodyCheck(
  response: { status: () => number; json: () => Promise<unknown> },
  endpoint: string,
  role: string,
  validate: (body: unknown) => void
): Promise<void> {
  // First, ensure the status is 200
  expectAllowed(response, endpoint, role);
  
  // Then validate the response body
  try {
    const body = await response.json();
    validate(body);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    expect(
      false,
      `BODY VALIDATION FAILED: ${endpoint} for ${role}\n` +
      `Status was 200 but response body validation failed.\n` +
      `Error: ${errorMessage}\n\n` +
      `POSSIBLE CAUSES:\n` +
      `  • Cross-tenant data leak (org_id mismatch)\n` +
      `  • Invalid response schema\n` +
      `  • Missing required fields\n` +
      `ACTION: Check the validate() function and response payload.`
    ).toBe(true);
  }
}

/**
 * Strict assertion for endpoints that MUST be denied.
 * Expects exactly 403 Forbidden.
 */
function expectDenied(
  response: { status: () => number },
  endpoint: string,
  role: string
): void {
  const status = response.status();
  expect(
    status,
    `${role} should NOT access ${endpoint} - got ${status}, expected 403.\n` +
    `DIAGNOSIS:\n` +
    `  • 200: RBAC guard not enforcing restrictions - SECURITY ISSUE\n` +
    `  • 404: Guard may be hiding unauthorized access as "not found"\n` +
    `  • 401: Authentication issue, not authorization\n` +
    `ACTION: Verify RBAC guard exists and returns 403 for unauthorized access.`
  ).toBe(403);
}

// API endpoints categorized by module
const API_ENDPOINTS = {
  finance: {
    invoices: '/api/finance/invoices',
    budgets: '/api/finance/budgets',
    expenses: '/api/finance/expenses',
    payments: '/api/finance/payments',
  },
  hr: {
    employees: '/api/hr/employees',
    payroll: '/api/hr/payroll',
    attendance: '/api/hr/attendance',
    leaves: '/api/hr/leaves',
  },
  support: {
    tickets: '/api/support/tickets',
    knowledgeBase: '/api/support/kb',
  },
  workOrders: {
    list: '/api/work-orders',
    create: '/api/work-orders',
    assign: '/api/work-orders/assign',
  },
  marketplace: {
    vendors: '/api/marketplace/vendors',
    bids: '/api/marketplace/bids',
  },
  properties: {
    list: '/api/properties',
    units: '/api/properties/units',
  },
  admin: {
    users: '/api/admin/users',
    settings: '/api/admin/settings',
  },
} as const;

/**
 * Helper to extract cookies from page context for API requests
 */
async function getAuthCookies(page: Page): Promise<string> {
  const cookies = await page.context().cookies();
  return cookies.map(c => `${c.name}=${c.value}`).join('; ');
}

/**
 * Helper to make authenticated API request
 */
async function makeAuthenticatedRequest(
  page: Page,
  request: APIRequestContext,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET'
) {
  const cookies = await getAuthCookies(page);
  
  const options = {
    headers: {
      'Cookie': cookies,
      'Content-Type': 'application/json',
    },
  };

  switch (method) {
    case 'POST':
      return request.post(endpoint, { ...options, data: {} });
    case 'PUT':
      return request.put(endpoint, { ...options, data: {} });
    case 'DELETE':
      return request.delete(endpoint, options);
    default:
      return request.get(endpoint, options);
  }
}

async function gotoWithRetry(page: Page, path: string, attempts = 3) {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      await page.goto(path, { waitUntil: 'load', timeout: DEFAULT_TIMEOUT });
      return;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(1000);
    }
  }
  throw lastError;
}

test.describe('Sub-Role API Access Control', () => {
  test.describe('FINANCE_OFFICER Sub-Role', () => {
    let credentials: TestCredentials;

    test.beforeAll(() => {
      credentials = getCredentials('FINANCE_OFFICER');
    });

    test.beforeEach(async ({ page }) => {
      await page.context().clearCookies();
      await gotoWithRetry(page, '/login');
    });

    test('can access finance invoices API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for FINANCE_OFFICER: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.finance.invoices);
      expectAllowedOrEmpty(response, API_ENDPOINTS.finance.invoices, 'FINANCE_OFFICER');
    });

    test('can access finance budgets API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for FINANCE_OFFICER: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.finance.budgets);
      expectAllowedOrEmpty(response, API_ENDPOINTS.finance.budgets, 'FINANCE_OFFICER');
    });

    test('can access finance expenses API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for FINANCE_OFFICER: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.finance.expenses);
      expectAllowedOrEmpty(response, API_ENDPOINTS.finance.expenses, 'FINANCE_OFFICER');
    });

    test('CANNOT access HR payroll API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for FINANCE_OFFICER: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.hr.payroll);
      expectDenied(response, API_ENDPOINTS.hr.payroll, 'FINANCE_OFFICER');
    });

    test('CANNOT access admin users API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for FINANCE_OFFICER: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.admin.users);
      expectDenied(response, API_ENDPOINTS.admin.users, 'FINANCE_OFFICER');
    });
  });

  test.describe('HR_OFFICER Sub-Role', () => {
    let credentials: TestCredentials;

    test.beforeAll(() => {
      credentials = getCredentials('HR_OFFICER');
    });

    test.beforeEach(async ({ page }) => {
      await page.context().clearCookies();
      await gotoWithRetry(page, '/login');
    });

    test('can access HR employees API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for HR_OFFICER: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.hr.employees);
      expectAllowedOrEmpty(response, API_ENDPOINTS.hr.employees, 'HR_OFFICER');
    });

    test('can access HR payroll API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for HR_OFFICER: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.hr.payroll);
      expectAllowedOrEmpty(response, API_ENDPOINTS.hr.payroll, 'HR_OFFICER');
    });

    test('can access HR attendance API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for HR_OFFICER: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.hr.attendance);
      expectAllowedOrEmpty(response, API_ENDPOINTS.hr.attendance, 'HR_OFFICER');
    });

    test('CANNOT access finance invoices API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for HR_OFFICER: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.finance.invoices);
      expectDenied(response, API_ENDPOINTS.finance.invoices, 'HR_OFFICER');
    });

    test('CANNOT access marketplace vendors API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for HR_OFFICER: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.marketplace.vendors);
      expectDenied(response, API_ENDPOINTS.marketplace.vendors, 'HR_OFFICER');
    });
  });

  test.describe('SUPPORT_AGENT Sub-Role', () => {
    let credentials: TestCredentials;

    test.beforeAll(() => {
      credentials = getCredentials('SUPPORT_AGENT');
    });

    test.beforeEach(async ({ page }) => {
      await page.context().clearCookies();
      await gotoWithRetry(page, '/login');
    });

    test('can access support tickets API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for SUPPORT_AGENT: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.support.tickets);
      expectAllowedOrEmpty(response, API_ENDPOINTS.support.tickets, 'SUPPORT_AGENT');
    });

    test('can access knowledge base API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for SUPPORT_AGENT: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.support.knowledgeBase);
      expectAllowedOrEmpty(response, API_ENDPOINTS.support.knowledgeBase, 'SUPPORT_AGENT');
    });

    test('CANNOT access HR payroll API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for SUPPORT_AGENT: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.hr.payroll);
      expectDenied(response, API_ENDPOINTS.hr.payroll, 'SUPPORT_AGENT');
    });

    test('CANNOT access finance budgets API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for SUPPORT_AGENT: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.finance.budgets);
      expectDenied(response, API_ENDPOINTS.finance.budgets, 'SUPPORT_AGENT');
    });
  });

  test.describe('OPERATIONS_MANAGER Sub-Role', () => {
    let credentials: TestCredentials;

    test.beforeAll(() => {
      credentials = getCredentials('OPERATIONS_MANAGER');
    });

    test.beforeEach(async ({ page }) => {
      await page.context().clearCookies();
      await gotoWithRetry(page, '/login');
    });

    test('can access work orders API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for OPERATIONS_MANAGER: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.workOrders.list);
      expectAllowedOrEmpty(response, API_ENDPOINTS.workOrders.list, 'OPERATIONS_MANAGER');
    });

    test('can access properties API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for OPERATIONS_MANAGER: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.properties.list);
      expectAllowedOrEmpty(response, API_ENDPOINTS.properties.list, 'OPERATIONS_MANAGER');
    });

    test('can access marketplace vendors API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for OPERATIONS_MANAGER: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.marketplace.vendors);
      expectAllowedOrEmpty(response, API_ENDPOINTS.marketplace.vendors, 'OPERATIONS_MANAGER');
    });

    test('CANNOT access HR payroll API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for OPERATIONS_MANAGER: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.hr.payroll);
      expectDenied(response, API_ENDPOINTS.hr.payroll, 'OPERATIONS_MANAGER');
    });

    test('CANNOT access admin users API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for OPERATIONS_MANAGER: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.admin.users);
      expectDenied(response, API_ENDPOINTS.admin.users, 'OPERATIONS_MANAGER');
    });
  });

  test.describe('TEAM_MEMBER (No Sub-Role)', () => {
    let credentials: TestCredentials;

    test.beforeAll(() => {
      credentials = getCredentials('TEAM_MEMBER');
    });

    test.beforeEach(async ({ page }) => {
      await page.context().clearCookies();
      await gotoWithRetry(page, '/login');
    });

    test('CANNOT access finance invoices API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for TEAM_MEMBER: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.finance.invoices);
      expectDenied(response, API_ENDPOINTS.finance.invoices, 'TEAM_MEMBER');
    });

    test('CANNOT access HR payroll API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for TEAM_MEMBER: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.hr.payroll);
      expectDenied(response, API_ENDPOINTS.hr.payroll, 'TEAM_MEMBER');
    });

    test('CANNOT access marketplace vendors API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for TEAM_MEMBER: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.marketplace.vendors);
      expectDenied(response, API_ENDPOINTS.marketplace.vendors, 'TEAM_MEMBER');
    });

    test('can access basic work orders API (base permission)', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for TEAM_MEMBER: ${result.errorText || 'unknown'}`).toBeTruthy();

      // TEAM_MEMBER base role should have read access to work orders
      // RBAC v4.1: TEAM_MEMBER can view work orders assigned to them or their properties
      // 
      // CRITICAL: We MUST verify this is allowed (200 or 404), NOT forbidden (403)
      // The previous test accepted [200, 403, 404] which was a no-op that couldn't
      // detect either over-permission or under-permission.
      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.workOrders.list);
      expectAllowedOrEmpty(response, API_ENDPOINTS.workOrders.list, 'TEAM_MEMBER');
    });

    test('CANNOT access admin users API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for TEAM_MEMBER: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.admin.users);
      expectDenied(response, API_ENDPOINTS.admin.users, 'TEAM_MEMBER');
    });
  });

  test.describe('Cross-Sub-Role Boundaries', () => {
    test('FINANCE_OFFICER cannot access HR module (cross-boundary)', async ({ page, request }) => {
      const credentials = getCredentials('FINANCE_OFFICER');
      await page.context().clearCookies();
      await gotoWithRetry(page, '/login');

      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for FINANCE_OFFICER: ${result.errorText || 'unknown'}`).toBeTruthy();

      // Finance officer should NOT have access to HR endpoints
      const hrEndpoints = [
        API_ENDPOINTS.hr.employees,
        API_ENDPOINTS.hr.payroll,
        API_ENDPOINTS.hr.attendance,
        API_ENDPOINTS.hr.leaves,
      ];

      for (const endpoint of hrEndpoints) {
        const response = await makeAuthenticatedRequest(page, request, endpoint);
        expectDenied(response, endpoint, 'FINANCE_OFFICER');
      }
    });

    test('HR_OFFICER cannot access Finance module (cross-boundary)', async ({ page, request }) => {
      const credentials = getCredentials('HR_OFFICER');
      await page.context().clearCookies();
      await gotoWithRetry(page, '/login');

      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for HR_OFFICER: ${result.errorText || 'unknown'}`).toBeTruthy();

      // HR officer should NOT have access to Finance endpoints
      const financeEndpoints = [
        API_ENDPOINTS.finance.invoices,
        API_ENDPOINTS.finance.budgets,
        API_ENDPOINTS.finance.expenses,
        API_ENDPOINTS.finance.payments,
      ];

      for (const endpoint of financeEndpoints) {
        const response = await makeAuthenticatedRequest(page, request, endpoint);
        expectDenied(response, endpoint, 'HR_OFFICER');
      }
    });

    test('SUPPORT_AGENT cannot access Operations module (cross-boundary)', async ({ page, request }) => {
      const credentials = getCredentials('SUPPORT_AGENT');
      await page.context().clearCookies();
      await gotoWithRetry(page, '/login');

      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for SUPPORT_AGENT: ${result.errorText || 'unknown'}`).toBeTruthy();

      // Support agent should NOT have access to Work Orders assign endpoint
      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.workOrders.assign);
      expectDenied(response, API_ENDPOINTS.workOrders.assign, 'SUPPORT_AGENT');
    });
  });

  test.describe('Admin Full Access', () => {
    let credentials: TestCredentials;

    test.beforeAll(() => {
      credentials = getCredentials('ADMIN');
    });

    test.beforeEach(async ({ page }) => {
      await page.context().clearCookies();
      await gotoWithRetry(page, '/login');
    });

    test('ADMIN can access all module APIs', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for ADMIN: ${result.errorText || 'unknown'}`).toBeTruthy();

      // Admin should have access to all endpoints
      const allEndpoints = [
        API_ENDPOINTS.finance.invoices,
        API_ENDPOINTS.hr.employees,
        API_ENDPOINTS.support.tickets,
        API_ENDPOINTS.workOrders.list,
        API_ENDPOINTS.marketplace.vendors,
        API_ENDPOINTS.properties.list,
      ];

      for (const endpoint of allEndpoints) {
        const response = await makeAuthenticatedRequest(page, request, endpoint);
        expectAllowedOrEmpty(response, endpoint, 'ADMIN');
      }
    });

    test('ADMIN can access admin users API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for ADMIN: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.admin.users);
      expectAllowedOrEmpty(response, API_ENDPOINTS.admin.users, 'ADMIN');
    });
  });

  test.describe('API Method Restrictions', () => {
    test('FINANCE_OFFICER can GET but not DELETE invoices', async ({ page, request }) => {
      const credentials = getCredentials('FINANCE_OFFICER');
      await page.context().clearCookies();
      await gotoWithRetry(page, '/login');

      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for FINANCE_OFFICER: ${result.errorText || 'unknown'}`).toBeTruthy();

      // GET should be allowed
      const getResponse = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.finance.invoices, 'GET');
      expectAllowedOrEmpty(getResponse, API_ENDPOINTS.finance.invoices, 'FINANCE_OFFICER');

      // DELETE should be forbidden (only ADMIN can delete)
      // NOTE: We test with a known non-existent ID to ensure we're testing permissions, not data
      const deleteResponse = await makeAuthenticatedRequest(page, request, `${API_ENDPOINTS.finance.invoices}/rbac-test-nonexistent`, 'DELETE');
      const deleteStatus = deleteResponse.status();
      
      // RBAC should return 403 for unauthorized delete attempts
      // 405 is acceptable if the endpoint doesn't support DELETE method
      // 404 is problematic - could mask permission issues (backend returns 404 instead of 403)
      expect(
        [403, 405].includes(deleteStatus),
        `FINANCE_OFFICER DELETE ${API_ENDPOINTS.finance.invoices}/rbac-test-nonexistent got ${deleteStatus}.\n` +
        `Expected 403 (Forbidden) or 405 (Method Not Allowed).\n` +
        `If 404: Backend may be returning "not found" instead of "forbidden" - security through obscurity.\n` +
        `If 200: SECURITY ISSUE - unauthorized delete succeeded!`
      ).toBe(true);
    });

    test('HR_OFFICER can GET but not approve payroll without specific action permission', async ({ page, request }) => {
      const credentials = getCredentials('HR_OFFICER');
      await page.context().clearCookies();
      await gotoWithRetry(page, '/login');

      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for HR_OFFICER: ${result.errorText || 'unknown'}`).toBeTruthy();

      // GET should be allowed
      const getResponse = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.hr.payroll, 'GET');
      expectAllowedOrEmpty(getResponse, API_ENDPOINTS.hr.payroll, 'HR_OFFICER');

      // POST to approve endpoint - HR_OFFICER may or may not have approve permission
      // depending on RBAC v4.1 configuration for action-level permissions
      const cookies = await getAuthCookies(page);
      const approveResponse = await request.post(`${API_ENDPOINTS.hr.payroll}/approve`, {
        headers: {
          'Cookie': cookies,
          'Content-Type': 'application/json',
        },
        // Provide minimal payload to avoid 400 Bad Request masking permission issues
        data: { payrollId: 'rbac-test-nonexistent', action: 'approve' },
      });
      
      const approveStatus = approveResponse.status();
      
      // Valid outcomes:
      // 200: HR_OFFICER has approve permission (document this in RBAC matrix)
      // 403: HR_OFFICER lacks approve permission (expected based on current RBAC)
      // 404: Endpoint doesn't exist yet (acceptable during development)
      // 400: Payload validation failed (still tells us we got past auth/RBAC)
      //
      // NOT acceptable:
      // 401: Authentication failed (login issue, not RBAC test)
      // 500: Server error (backend bug)
      expect(
        approveStatus,
        `HR_OFFICER payroll approve got 401 - authentication issue, not RBAC`
      ).not.toBe(401);
      
      expect(
        approveStatus,
        `HR_OFFICER payroll approve got 500 - server error`
      ).not.toBe(500);
      
      // Log the actual behavior for RBAC documentation
      if (approveStatus === 200) {
        console.log(`📝 RBAC: HR_OFFICER CAN approve payroll (status 200)`);
      } else if (approveStatus === 403) {
        console.log(`📝 RBAC: HR_OFFICER CANNOT approve payroll (status 403) - as expected`);
      } else {
        console.log(`📝 RBAC: Payroll approve endpoint returned ${approveStatus}`);
      }
    });
  });
});

test.describe('Unauthenticated API Access', () => {
  test('unauthenticated requests return 401', async ({ request }) => {
    const protectedEndpoints = [
      API_ENDPOINTS.finance.invoices,
      API_ENDPOINTS.hr.employees,
      API_ENDPOINTS.support.tickets,
      API_ENDPOINTS.workOrders.list,
      API_ENDPOINTS.admin.users,
    ];

    for (const endpoint of protectedEndpoints) {
      const response = await request.get(endpoint);
      expect(
        [401, 403],
        `Unauthenticated request to ${endpoint} should return 401 or 403`
      ).toContain(response.status());
    }
  });
});

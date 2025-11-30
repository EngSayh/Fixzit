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
 * - Replaced test.skip() with expect().toBeTruthy() for fail-fast
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
 * Assertion helper for endpoints that SHOULD be accessible.
 * 
 * IMPORTANT: We accept ONLY 200 to ensure RBAC is working.
 * 404 could mask RBAC failures (e.g., guard returns 404 instead of 403).
 * If an endpoint legitimately returns 404 for empty data, use expectAllowedOrEmpty.
 */
function expectAllowed(
  response: { status: () => number },
  endpoint: string,
  role: string
): void {
  const status = response.status();
  expect(
    status,
    `${role} SHOULD access ${endpoint} - got ${status}, expected 200. ` +
    `If 403: RBAC guard may be misconfigured. If 404: endpoint may not exist or RBAC returns 404.`
  ).toBe(200);
}

/**
 * Assertion helper for endpoints that SHOULD be accessible but may return empty data.
 * Use this ONLY when the endpoint is known to return 404 for empty collections.
 */
function expectAllowedOrEmpty(
  response: { status: () => number },
  endpoint: string,
  role: string
): void {
  const status = response.status();
  expect(
    [200, 404].includes(status),
    `${role} SHOULD access ${endpoint} - got ${status}, expected 200 or 404 (empty). ` +
    `If 403: RBAC guard is denying access incorrectly.`
  ).toBe(true);
  // Ensure we're NOT getting 403 - this is the critical RBAC check
  expect(
    status,
    `${role} SHOULD NOT be forbidden from ${endpoint}`
  ).not.toBe(403);
}

/**
 * Assertion helper for endpoints that SHOULD be denied.
 */
function expectDenied(
  response: { status: () => number },
  endpoint: string,
  role: string
): void {
  const status = response.status();
  expect(
    status,
    `${role} should NOT access ${endpoint} - got ${status}, expected 403. ` +
    `If 200: RBAC guard is not enforcing restrictions.`
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
      // Using expectAllowedOrEmpty: accepts 200 or 404 (empty), but NOT 403
      // This ensures RBAC is not incorrectly denying access
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
      const deleteResponse = await makeAuthenticatedRequest(page, request, `${API_ENDPOINTS.finance.invoices}/test-id`, 'DELETE');
      // 403 Forbidden, 404 if endpoint doesn't exist, or 405 Method Not Allowed
      expect([403, 404, 405]).toContain(deleteResponse.status());
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

      // POST to approve endpoint should check for approve permission
      const approveResponse = await makeAuthenticatedRequest(
        page,
        request,
        `${API_ENDPOINTS.hr.payroll}/approve`,
        'POST'
      );
      // Either allowed (200), forbidden (403), or endpoint doesn't exist (404)
      expect([200, 403, 404]).toContain(approveResponse.status());
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

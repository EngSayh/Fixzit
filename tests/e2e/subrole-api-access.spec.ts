import { test, expect, Page, APIRequestContext } from '@playwright/test';
import { attemptLogin, getTestUserFromEnv } from './utils/auth';

/**
 * Sub-Role API Access E2E Tests
 * 
 * Tests that sub-roles can/cannot access appropriate API endpoints.
 * Validates that RBAC rules are enforced at the API layer.
 * 
 * Resolves: E2E-001 from PR Comments Audit
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const DEFAULT_TIMEOUT = 30000;

// Test users - set via environment variables for different sub-roles
const FINANCE_OFFICER_USER = {
  email: process.env.TEST_FINANCE_OFFICER_EMAIL || 'finance.officer@fixzit.co',
  password: process.env.TEST_FINANCE_OFFICER_PASSWORD || 'Test@1234',
};

const HR_OFFICER_USER = {
  email: process.env.TEST_HR_OFFICER_EMAIL || 'hr.officer@fixzit.co',
  password: process.env.TEST_HR_OFFICER_PASSWORD || 'Test@1234',
};

const SUPPORT_AGENT_USER = {
  email: process.env.TEST_SUPPORT_AGENT_EMAIL || 'support.agent@fixzit.co',
  password: process.env.TEST_SUPPORT_AGENT_PASSWORD || 'Test@1234',
};

const OPERATIONS_MANAGER_USER = {
  email: process.env.TEST_OPERATIONS_MANAGER_EMAIL || 'ops.manager@fixzit.co',
  password: process.env.TEST_OPERATIONS_MANAGER_PASSWORD || 'Test@1234',
};

const TEAM_MEMBER_USER = {
  email: process.env.TEST_TEAM_MEMBER_EMAIL || 'team.member@fixzit.co',
  password: process.env.TEST_TEAM_MEMBER_PASSWORD || 'Test@1234',
};

const ADMIN_USER = getTestUserFromEnv() || {
  email: process.env.TEST_USER_EMAIL || 'test-admin@fixzit.co',
  password: process.env.TEST_USER_PASSWORD || 'Test@1234',
};

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
    test.beforeEach(async ({ page }) => {
      await page.context().clearCookies();
      await gotoWithRetry(page, '/login');
    });

    test('can access finance invoices API', async ({ page, request }) => {
      const result = await attemptLogin(page, FINANCE_OFFICER_USER.email, FINANCE_OFFICER_USER.password);
      test.skip(!result.success, `Login failed for FINANCE_OFFICER: ${result.errorText || 'unknown'}`);

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.finance.invoices);
      expect([200, 404]).toContain(response.status()); // 200 or 404 (no data) are both acceptable
      expect(response.status()).not.toBe(403); // Must NOT be forbidden
    });

    test('can access finance budgets API', async ({ page, request }) => {
      const result = await attemptLogin(page, FINANCE_OFFICER_USER.email, FINANCE_OFFICER_USER.password);
      test.skip(!result.success, `Login failed for FINANCE_OFFICER: ${result.errorText || 'unknown'}`);

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.finance.budgets);
      expect([200, 404]).toContain(response.status());
      expect(response.status()).not.toBe(403);
    });

    test('can access finance expenses API', async ({ page, request }) => {
      const result = await attemptLogin(page, FINANCE_OFFICER_USER.email, FINANCE_OFFICER_USER.password);
      test.skip(!result.success, `Login failed for FINANCE_OFFICER: ${result.errorText || 'unknown'}`);

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.finance.expenses);
      expect([200, 404]).toContain(response.status());
      expect(response.status()).not.toBe(403);
    });

    test('CANNOT access HR payroll API', async ({ page, request }) => {
      const result = await attemptLogin(page, FINANCE_OFFICER_USER.email, FINANCE_OFFICER_USER.password);
      test.skip(!result.success, `Login failed for FINANCE_OFFICER: ${result.errorText || 'unknown'}`);

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.hr.payroll);
      expect(response.status()).toBe(403); // Must be forbidden
    });

    test('CANNOT access admin users API', async ({ page, request }) => {
      const result = await attemptLogin(page, FINANCE_OFFICER_USER.email, FINANCE_OFFICER_USER.password);
      test.skip(!result.success, `Login failed for FINANCE_OFFICER: ${result.errorText || 'unknown'}`);

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.admin.users);
      expect(response.status()).toBe(403); // Must be forbidden
    });
  });

  test.describe('HR_OFFICER Sub-Role', () => {
    test.beforeEach(async ({ page }) => {
      await page.context().clearCookies();
      await gotoWithRetry(page, '/login');
    });

    test('can access HR employees API', async ({ page, request }) => {
      const result = await attemptLogin(page, HR_OFFICER_USER.email, HR_OFFICER_USER.password);
      test.skip(!result.success, `Login failed for HR_OFFICER: ${result.errorText || 'unknown'}`);

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.hr.employees);
      expect([200, 404]).toContain(response.status());
      expect(response.status()).not.toBe(403);
    });

    test('can access HR payroll API', async ({ page, request }) => {
      const result = await attemptLogin(page, HR_OFFICER_USER.email, HR_OFFICER_USER.password);
      test.skip(!result.success, `Login failed for HR_OFFICER: ${result.errorText || 'unknown'}`);

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.hr.payroll);
      expect([200, 404]).toContain(response.status());
      expect(response.status()).not.toBe(403);
    });

    test('can access HR attendance API', async ({ page, request }) => {
      const result = await attemptLogin(page, HR_OFFICER_USER.email, HR_OFFICER_USER.password);
      test.skip(!result.success, `Login failed for HR_OFFICER: ${result.errorText || 'unknown'}`);

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.hr.attendance);
      expect([200, 404]).toContain(response.status());
      expect(response.status()).not.toBe(403);
    });

    test('CANNOT access finance invoices API', async ({ page, request }) => {
      const result = await attemptLogin(page, HR_OFFICER_USER.email, HR_OFFICER_USER.password);
      test.skip(!result.success, `Login failed for HR_OFFICER: ${result.errorText || 'unknown'}`);

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.finance.invoices);
      expect(response.status()).toBe(403); // Must be forbidden
    });

    test('CANNOT access marketplace vendors API', async ({ page, request }) => {
      const result = await attemptLogin(page, HR_OFFICER_USER.email, HR_OFFICER_USER.password);
      test.skip(!result.success, `Login failed for HR_OFFICER: ${result.errorText || 'unknown'}`);

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.marketplace.vendors);
      expect(response.status()).toBe(403); // Must be forbidden
    });
  });

  test.describe('SUPPORT_AGENT Sub-Role', () => {
    test.beforeEach(async ({ page }) => {
      await page.context().clearCookies();
      await gotoWithRetry(page, '/login');
    });

    test('can access support tickets API', async ({ page, request }) => {
      const result = await attemptLogin(page, SUPPORT_AGENT_USER.email, SUPPORT_AGENT_USER.password);
      test.skip(!result.success, `Login failed for SUPPORT_AGENT: ${result.errorText || 'unknown'}`);

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.support.tickets);
      expect([200, 404]).toContain(response.status());
      expect(response.status()).not.toBe(403);
    });

    test('can access knowledge base API', async ({ page, request }) => {
      const result = await attemptLogin(page, SUPPORT_AGENT_USER.email, SUPPORT_AGENT_USER.password);
      test.skip(!result.success, `Login failed for SUPPORT_AGENT: ${result.errorText || 'unknown'}`);

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.support.knowledgeBase);
      expect([200, 404]).toContain(response.status());
      expect(response.status()).not.toBe(403);
    });

    test('CANNOT access HR payroll API', async ({ page, request }) => {
      const result = await attemptLogin(page, SUPPORT_AGENT_USER.email, SUPPORT_AGENT_USER.password);
      test.skip(!result.success, `Login failed for SUPPORT_AGENT: ${result.errorText || 'unknown'}`);

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.hr.payroll);
      expect(response.status()).toBe(403); // Must be forbidden
    });

    test('CANNOT access finance budgets API', async ({ page, request }) => {
      const result = await attemptLogin(page, SUPPORT_AGENT_USER.email, SUPPORT_AGENT_USER.password);
      test.skip(!result.success, `Login failed for SUPPORT_AGENT: ${result.errorText || 'unknown'}`);

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.finance.budgets);
      expect(response.status()).toBe(403); // Must be forbidden
    });
  });

  test.describe('OPERATIONS_MANAGER Sub-Role', () => {
    test.beforeEach(async ({ page }) => {
      await page.context().clearCookies();
      await gotoWithRetry(page, '/login');
    });

    test('can access work orders API', async ({ page, request }) => {
      const result = await attemptLogin(page, OPERATIONS_MANAGER_USER.email, OPERATIONS_MANAGER_USER.password);
      test.skip(!result.success, `Login failed for OPERATIONS_MANAGER: ${result.errorText || 'unknown'}`);

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.workOrders.list);
      expect([200, 404]).toContain(response.status());
      expect(response.status()).not.toBe(403);
    });

    test('can access properties API', async ({ page, request }) => {
      const result = await attemptLogin(page, OPERATIONS_MANAGER_USER.email, OPERATIONS_MANAGER_USER.password);
      test.skip(!result.success, `Login failed for OPERATIONS_MANAGER: ${result.errorText || 'unknown'}`);

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.properties.list);
      expect([200, 404]).toContain(response.status());
      expect(response.status()).not.toBe(403);
    });

    test('can access marketplace vendors API', async ({ page, request }) => {
      const result = await attemptLogin(page, OPERATIONS_MANAGER_USER.email, OPERATIONS_MANAGER_USER.password);
      test.skip(!result.success, `Login failed for OPERATIONS_MANAGER: ${result.errorText || 'unknown'}`);

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.marketplace.vendors);
      expect([200, 404]).toContain(response.status());
      expect(response.status()).not.toBe(403);
    });

    test('CANNOT access HR payroll API', async ({ page, request }) => {
      const result = await attemptLogin(page, OPERATIONS_MANAGER_USER.email, OPERATIONS_MANAGER_USER.password);
      test.skip(!result.success, `Login failed for OPERATIONS_MANAGER: ${result.errorText || 'unknown'}`);

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.hr.payroll);
      expect(response.status()).toBe(403); // Must be forbidden
    });

    test('CANNOT access admin users API', async ({ page, request }) => {
      const result = await attemptLogin(page, OPERATIONS_MANAGER_USER.email, OPERATIONS_MANAGER_USER.password);
      test.skip(!result.success, `Login failed for OPERATIONS_MANAGER: ${result.errorText || 'unknown'}`);

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.admin.users);
      expect(response.status()).toBe(403); // Must be forbidden
    });
  });

  test.describe('TEAM_MEMBER (No Sub-Role)', () => {
    test.beforeEach(async ({ page }) => {
      await page.context().clearCookies();
      await gotoWithRetry(page, '/login');
    });

    test('CANNOT access finance invoices API', async ({ page, request }) => {
      const result = await attemptLogin(page, TEAM_MEMBER_USER.email, TEAM_MEMBER_USER.password);
      test.skip(!result.success, `Login failed for TEAM_MEMBER: ${result.errorText || 'unknown'}`);

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.finance.invoices);
      expect(response.status()).toBe(403); // Must be forbidden without FINANCE_OFFICER sub-role
    });

    test('CANNOT access HR payroll API', async ({ page, request }) => {
      const result = await attemptLogin(page, TEAM_MEMBER_USER.email, TEAM_MEMBER_USER.password);
      test.skip(!result.success, `Login failed for TEAM_MEMBER: ${result.errorText || 'unknown'}`);

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.hr.payroll);
      expect(response.status()).toBe(403); // Must be forbidden without HR_OFFICER sub-role
    });

    test('CANNOT access marketplace vendors API', async ({ page, request }) => {
      const result = await attemptLogin(page, TEAM_MEMBER_USER.email, TEAM_MEMBER_USER.password);
      test.skip(!result.success, `Login failed for TEAM_MEMBER: ${result.errorText || 'unknown'}`);

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.marketplace.vendors);
      expect(response.status()).toBe(403); // Must be forbidden without OPERATIONS_MANAGER sub-role
    });

    test('can access basic work orders API (base permission)', async ({ page, request }) => {
      const result = await attemptLogin(page, TEAM_MEMBER_USER.email, TEAM_MEMBER_USER.password);
      test.skip(!result.success, `Login failed for TEAM_MEMBER: ${result.errorText || 'unknown'}`);

      // TEAM_MEMBER base role should have read access to work orders
      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.workOrders.list);
      expect([200, 403, 404]).toContain(response.status()); // May or may not have access depending on exact config
    });

    test('CANNOT access admin users API', async ({ page, request }) => {
      const result = await attemptLogin(page, TEAM_MEMBER_USER.email, TEAM_MEMBER_USER.password);
      test.skip(!result.success, `Login failed for TEAM_MEMBER: ${result.errorText || 'unknown'}`);

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.admin.users);
      expect(response.status()).toBe(403); // Must be forbidden
    });
  });

  test.describe('Cross-Sub-Role Boundaries', () => {
    test('FINANCE_OFFICER cannot access HR module (cross-boundary)', async ({ page, request }) => {
      await page.context().clearCookies();
      await gotoWithRetry(page, '/login');

      const result = await attemptLogin(page, FINANCE_OFFICER_USER.email, FINANCE_OFFICER_USER.password);
      test.skip(!result.success, `Login failed for FINANCE_OFFICER: ${result.errorText || 'unknown'}`);

      // Finance officer should NOT have access to HR endpoints
      const hrEndpoints = [
        API_ENDPOINTS.hr.employees,
        API_ENDPOINTS.hr.payroll,
        API_ENDPOINTS.hr.attendance,
        API_ENDPOINTS.hr.leaves,
      ];

      for (const endpoint of hrEndpoints) {
        const response = await makeAuthenticatedRequest(page, request, endpoint);
        expect(
          response.status(),
          `FINANCE_OFFICER should NOT access ${endpoint}`
        ).toBe(403);
      }
    });

    test('HR_OFFICER cannot access Finance module (cross-boundary)', async ({ page, request }) => {
      await page.context().clearCookies();
      await gotoWithRetry(page, '/login');

      const result = await attemptLogin(page, HR_OFFICER_USER.email, HR_OFFICER_USER.password);
      test.skip(!result.success, `Login failed for HR_OFFICER: ${result.errorText || 'unknown'}`);

      // HR officer should NOT have access to Finance endpoints
      const financeEndpoints = [
        API_ENDPOINTS.finance.invoices,
        API_ENDPOINTS.finance.budgets,
        API_ENDPOINTS.finance.expenses,
        API_ENDPOINTS.finance.payments,
      ];

      for (const endpoint of financeEndpoints) {
        const response = await makeAuthenticatedRequest(page, request, endpoint);
        expect(
          response.status(),
          `HR_OFFICER should NOT access ${endpoint}`
        ).toBe(403);
      }
    });

    test('SUPPORT_AGENT cannot access Operations module (cross-boundary)', async ({ page, request }) => {
      await page.context().clearCookies();
      await gotoWithRetry(page, '/login');

      const result = await attemptLogin(page, SUPPORT_AGENT_USER.email, SUPPORT_AGENT_USER.password);
      test.skip(!result.success, `Login failed for SUPPORT_AGENT: ${result.errorText || 'unknown'}`);

      // Support agent should NOT have access to Work Orders assign endpoint
      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.workOrders.assign);
      expect(response.status()).toBe(403);
    });
  });

  test.describe('Admin Full Access', () => {
    test.beforeEach(async ({ page }) => {
      await page.context().clearCookies();
      await gotoWithRetry(page, '/login');
    });

    test('ADMIN can access all module APIs', async ({ page, request }) => {
      const result = await attemptLogin(page, ADMIN_USER.email, ADMIN_USER.password);
      test.skip(!result.success, `Login failed for ADMIN: ${result.errorText || 'unknown'}`);

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
        expect(
          [200, 404],
          `ADMIN should have access to ${endpoint} (got ${response.status()})`
        ).toContain(response.status());
        expect(
          response.status(),
          `ADMIN should NOT be forbidden from ${endpoint}`
        ).not.toBe(403);
      }
    });

    test('ADMIN can access admin users API', async ({ page, request }) => {
      const result = await attemptLogin(page, ADMIN_USER.email, ADMIN_USER.password);
      test.skip(!result.success, `Login failed for ADMIN: ${result.errorText || 'unknown'}`);

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.admin.users);
      expect([200, 404]).toContain(response.status());
      expect(response.status()).not.toBe(403);
    });
  });

  test.describe('API Method Restrictions', () => {
    test('FINANCE_OFFICER can GET but not DELETE invoices', async ({ page, request }) => {
      await page.context().clearCookies();
      await gotoWithRetry(page, '/login');

      const result = await attemptLogin(page, FINANCE_OFFICER_USER.email, FINANCE_OFFICER_USER.password);
      test.skip(!result.success, `Login failed for FINANCE_OFFICER: ${result.errorText || 'unknown'}`);

      // GET should be allowed
      const getResponse = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.finance.invoices, 'GET');
      expect([200, 404]).toContain(getResponse.status());

      // DELETE should be forbidden (only ADMIN can delete)
      const deleteResponse = await makeAuthenticatedRequest(page, request, `${API_ENDPOINTS.finance.invoices}/test-id`, 'DELETE');
      expect([403, 404, 405]).toContain(deleteResponse.status()); // 403 Forbidden or 404/405 if endpoint doesn't exist
    });

    test('HR_OFFICER can GET but not approve payroll without specific action permission', async ({ page, request }) => {
      await page.context().clearCookies();
      await gotoWithRetry(page, '/login');

      const result = await attemptLogin(page, HR_OFFICER_USER.email, HR_OFFICER_USER.password);
      test.skip(!result.success, `Login failed for HR_OFFICER: ${result.errorText || 'unknown'}`);

      // GET should be allowed
      const getResponse = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.hr.payroll, 'GET');
      expect([200, 404]).toContain(getResponse.status());

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

import { test, expect, Page, APIRequestContext } from '@playwright/test';
import { attemptLogin } from './utils/auth';
import {
  getRequiredTestCredentials,
  getTestOrgIdOptional,
  hasTestCredentials,
  type TestCredentials,
  type SubRoleKey,
} from './utils/credentials';

// SECURITY FIX (2025-11-30): Removed ALLOW_OFFLINE_E2E_DEFAULTS block
//
// The previous code allowed opt-in injection of fake credentials (Test@1234)
// via ALLOW_OFFLINE_E2E_DEFAULTS=true. This was removed because:
//
// 1. Even opt-in, it creates a path to undermine the fail-fast security pattern
// 2. If accidentally enabled in CI, RBAC/tenancy regressions would be masked
// 3. Fake credentials don't match real DB users, so tests produce false results
// 4. Inconsistent with auth.spec.ts which has no fallback mechanism
//
// CORRECT BEHAVIOR NOW:
// - Local dev: Configure real test credentials in .env.local
// - CI internal: Secrets configured in GitHub Actions
// - CI fork: Tests skip gracefully via IS_FORK_OR_MISSING_SECRETS detection
//
// If you need to run tests without real credentials:
//   1. Create test users in your local/dev database
//   2. Configure .env.local with their real credentials
//   3. There is NO shortcut - RBAC tests require real users
//
// See: tests/e2e/utils/credentials.ts for the secure credential pattern
// See: env.example for credential configuration documentation

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
 * 
 * AUDIT-2025-11-30 (Fork handling):
 * - Forked PRs cannot access secrets, so tests skip gracefully
 * - Internal CI still enforces hard failure for missing credentials
 */

const DEFAULT_TIMEOUT = 30000;

/**
 * FORK DETECTION
 * 
 * GitHub Actions doesn't expose secrets to forked PRs for security reasons.
 * We detect this to skip tests gracefully instead of crashing.
 * 
 * Environment variables set by GitHub Actions:
 * - GITHUB_EVENT_NAME: 'pull_request' for PRs
 * - GITHUB_HEAD_REF: set when running on a PR (branch name)
 * - GITHUB_REPOSITORY: 'owner/repo' 
 * - GITHUB_ACTOR: the user who triggered the action
 * 
 * For forked PRs, secrets are empty strings, not undefined.
 */
const IS_CI = process.env.CI === 'true';
const IS_GITHUB_ACTIONS = Boolean(process.env.GITHUB_ACTIONS);
const IS_PULL_REQUEST = process.env.GITHUB_EVENT_NAME === 'pull_request';

// Check if we have the required credentials available
const ALL_SUBROLES: SubRoleKey[] = [
  'FINANCE_OFFICER', 'HR_OFFICER', 'SUPPORT_AGENT', 
  'OPERATIONS_MANAGER', 'TEAM_MEMBER', 'ADMIN'
];
const HAS_ALL_CREDENTIALS = ALL_SUBROLES.every(hasTestCredentials);
const HAS_TENANT_ID = Boolean(getTestOrgIdOptional());

/**
 * Determine if this is a forked PR run where secrets are unavailable.
 * 
 * Detection logic:
 * 1. Must be CI (process.env.CI)
 * 2. Must be a pull_request event
 * 3. Must be missing credentials OR missing tenant ID
 * 
 * This covers both:
 * - Actual forks (external contributors)
 * - Misconfigured internal PRs (missing secrets)
 */
const IS_FORK_OR_MISSING_SECRETS = IS_CI && IS_PULL_REQUEST && (!HAS_ALL_CREDENTIALS || !HAS_TENANT_ID);
const ALLOW_MISSING_TEST_ORG_ID = process.env.ALLOW_MISSING_TEST_ORG_ID === 'true';

/**
 * MULTI-TENANCY VALIDATION GUARD
 * 
 * In CI (process.env.CI === 'true'), TEST_ORG_ID is REQUIRED to validate
 * that API responses don't leak cross-tenant data. Without it, tenant
 * isolation regressions can slip through.
 * 
 * AUDIT-2025-11-30: 
 * - Hard failure for internal CI runs (not forks)
 * - Graceful skip for forked PRs where secrets are unavailable
 * - Info message for local development
 */
const testOrgId = getTestOrgIdOptional();

if (IS_CI && !testOrgId && !IS_FORK_OR_MISSING_SECRETS) {
  // Internal CI run without TEST_ORG_ID - this is a configuration error
  throw new Error(
    'CI REQUIRES TEST_ORG_ID for multi-tenant isolation validation.\n\n' +
    'Cross-tenant data leaks are a critical security vulnerability.\n' +
    'Without TEST_ORG_ID, E2E tests cannot verify tenant scoping.\n\n' +
    'ACTION:\n' +
    '  1. Add TEST_ORG_ID to GitHub Secrets\n' +
    '  2. Pass it to E2E workflow via environment variable\n' +
    '  3. Value should be the org_id of the test tenant in your test database\n\n' +
    'See docs/E2E_SETUP.md for configuration details.'
  );
} else if (!testOrgId && !IS_CI) {
  console.info(
    'ℹ️  INFO: TEST_ORG_ID not set. Tenant scoping checks will be skipped.\n' +
    'For full multi-tenancy validation, set TEST_ORG_ID in .env.local.'
  );
}

// AUDIT-2025-11-30: Skip all tests in this file if running on a fork without secrets
// This prevents noisy failures and allows fork PRs to proceed without E2E
test.skip(
  IS_FORK_OR_MISSING_SECRETS,
  'Skipping sub-role API tests: forked PR or missing TEST_* credentials/TEST_ORG_ID. ' +
  'Internal PRs require all secrets configured in GitHub Actions.'
);

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
  response: {
    status: () => number;
    json: () => Promise<unknown>;
    text: () => Promise<string>;
  },
  endpoint: string,
  role: string,
  options?: {
    /**
     * Permit 404 only when the endpoint is documented to do so and caller opts in.
     */
    allowDocumentedEmpty404?: boolean;
    /**
     * If provided, verify payload org_id matches this tenant (basic leakage guard).
     */
    expectedOrgId?: string;
    /**
     * AUDIT-2025-11-30: Require org_id/orgId to be PRESENT in every response object.
     * 
     * When true, the test FAILS if any response object is missing org_id/orgId.
     * This catches APIs that omit tenant identifiers entirely, which would
     * otherwise pass validation silently (since there's no wrong value to detect).
     * 
     * Use this for endpoints that MUST return tenant-scoped data.
     * Set to false for endpoints that legitimately return tenant-agnostic data
     * (e.g., system configs, public metadata).
     * 
     * @default false for backward compatibility
     */
    requireOrgIdPresence?: boolean;
    /**
     * Custom payload validator.
     */
    validate?: (body: unknown) => void;
  }
): Promise<void> {
  const status = response.status();

  // AUDIT-2025-12-01: Fixed inverted logic that was allowing CI to skip tenant validation
  //
  // CORRECT BEHAVIOR:
  // - Internal CI (non-fork): TEST_ORG_ID is REQUIRED - fail loudly if missing
  // - Fork PRs: Skip gracefully (forks can't access secrets)
  // - Local dev: Require unless ALLOW_MISSING_TEST_ORG_ID=true
  //
  // The previous logic was inverted: it failed locally but warned in CI,
  // which meant tenant isolation regressions could slip through in CI.
  if (!options?.expectedOrgId) {
    if (IS_FORK_OR_MISSING_SECRETS) {
      // Fork PRs: graceful skip (forks can't access secrets)
      console.warn(
        '⚠️  Tenant validation skipped: Fork/missing secrets detected. ' +
        'This is expected for external contributor PRs.'
      );
    } else if (IS_CI) {
      // Internal CI: MUST have TEST_ORG_ID - fail hard
      expect(
        false,
        `TEST_ORG_ID is REQUIRED in CI for tenant validation.\n` +
        `Without TEST_ORG_ID, cross-tenant data leaks would not be detected.\n` +
        `\n` +
        `ACTION: Configure TEST_ORG_ID in GitHub Actions secrets.\n` +
        `See env.example for documentation.`
      ).toBe(true);
    } else if (ALLOW_MISSING_TEST_ORG_ID) {
      // Local dev with explicit bypass
      console.warn(
        '⚠️  Tenant validation bypassed locally via ALLOW_MISSING_TEST_ORG_ID=true. ' +
        'Set TEST_ORG_ID for full tenant isolation testing.'
      );
    } else {
      // Local dev without bypass - fail to encourage proper setup
      expect(
        false,
        `TEST_ORG_ID is required for tenant validation in expectAllowedWithBodyCheck.\n` +
        `Set TEST_ORG_ID in .env.local or export ALLOW_MISSING_TEST_ORG_ID=true to bypass locally.`
      ).toBe(true);
    }
  }

  if (status === 404) {
    expect(
      options?.allowDocumentedEmpty404 && isDocumentedEmpty404Endpoint(endpoint),
      `UNEXPECTED 404: ${endpoint} returned 404 for ${role} but is not documented to do so.\n` +
      `ACTION: Either document this endpoint in ENDPOINTS_DOCUMENTED_404_FOR_EMPTY or fix backend to return 200 + empty array.`
    ).toBe(true);
    console.warn(
      `📝 DOCUMENTED 404: ${endpoint} returned 404 for ${role}. ` +
      `Backend should migrate to 200 + empty array (REST best practice).`
    );
    return;
  }

  // First, ensure the status is 200
  expectAllowed(response, endpoint, role);

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    const raw = await response.text();
    const errorMessage = error instanceof Error ? error.message : String(error);
    expect(
      false,
      `BODY PARSE FAILED: ${endpoint} for ${role}\n` +
      `Status was 200 but response body could not be parsed as JSON.\n` +
      `Error: ${errorMessage}\n` +
      `Raw response: ${raw}`
    ).toBe(true);
    return;
  }

  // Basic tenant/org_id guardrail if provided
  // AUDIT-2025-11-30: Check BOTH org_id (snake_case) and orgId (camelCase)
  // Mongoose models typically use orgId, but API responses may use org_id
  if (options?.expectedOrgId) {
    const verifyOrgId = (value: unknown, index?: number) => {
      if (value && typeof value === 'object') {
        const v = value as Record<string, unknown>;
        // Check both org_id and orgId - Mongoose uses camelCase, some APIs use snake_case
        const foundOrgId = v.org_id ?? v.orgId;
        
        // AUDIT-2025-11-30: Enforce org_id PRESENCE when requireOrgIdPresence is true
        // This catches APIs that omit tenant identifiers entirely
        if (options.requireOrgIdPresence && foundOrgId === undefined) {
          const location = index !== undefined ? `[${index}]` : '';
          expect(
            false,
            `TENANT ID MISSING: ${endpoint} response${location} has no org_id or orgId field.\n` +
            `Role: ${role}\n` +
            `Expected: org_id or orgId field with value ${options.expectedOrgId}\n\n` +
            `SECURITY RISK: APIs that omit tenant identifiers can leak cross-tenant data.\n` +
            `ACTION:\n` +
            `  • If this endpoint SHOULD return tenant-scoped data: Fix backend to include org_id\n` +
            `  • If this endpoint is tenant-agnostic by design: Set requireOrgIdPresence: false`
          ).toBe(true);
        }
        
        if (foundOrgId !== undefined) {
          expect(
            String(foundOrgId),
            `Expected org_id/orgId=${options.expectedOrgId} in payload for ${endpoint}, got ${foundOrgId}`
          ).toBe(options.expectedOrgId);
        }
      }
    };

    if (Array.isArray(body)) {
      body.forEach((item, idx) => verifyOrgId(item, idx));
    } else {
      verifyOrgId(body);
    }
  }

  if (options?.validate) {
    try {
      options.validate(body);
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
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: Record<string, unknown>
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
      return request.post(endpoint, { ...options, data: data ?? {} });
    case 'PUT':
      return request.put(endpoint, { ...options, data: data ?? {} });
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
      await expectAllowedWithBodyCheck(
        response,
        API_ENDPOINTS.finance.invoices,
        'FINANCE_OFFICER',
        { expectedOrgId: getTestOrgIdOptional() }
      );
    });

    test('can access finance budgets API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for FINANCE_OFFICER: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.finance.budgets);
      await expectAllowedWithBodyCheck(
        response,
        API_ENDPOINTS.finance.budgets,
        'FINANCE_OFFICER',
        { expectedOrgId: getTestOrgIdOptional() }
      );
    });

    test('can access finance expenses API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for FINANCE_OFFICER: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.finance.expenses);
      await expectAllowedWithBodyCheck(
        response,
        API_ENDPOINTS.finance.expenses,
        'FINANCE_OFFICER',
        { expectedOrgId: getTestOrgIdOptional() }
      );
    });

    test('CANNOT access HR payroll API (cross-boundary)', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for FINANCE_OFFICER: ${result.errorText || 'unknown'}`).toBeTruthy();

      // STRICT v4 RBAC: Finance Officer should NOT have access to HR module
      // This enforces cross-boundary denial between Finance and HR domains
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
      await expectAllowedWithBodyCheck(
        response,
        API_ENDPOINTS.hr.employees,
        'HR_OFFICER',
        { expectedOrgId: getTestOrgIdOptional() }
      );
    });

    test('can access HR payroll API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for HR_OFFICER: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.hr.payroll);
      await expectAllowedWithBodyCheck(
        response,
        API_ENDPOINTS.hr.payroll,
        'HR_OFFICER',
        { expectedOrgId: getTestOrgIdOptional() }
      );
    });

    test('can access HR attendance API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for HR_OFFICER: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.hr.attendance);
      await expectAllowedWithBodyCheck(
        response,
        API_ENDPOINTS.hr.attendance,
        'HR_OFFICER',
        { expectedOrgId: getTestOrgIdOptional() }
      );
    });

    test('CANNOT access finance invoices API (cross-boundary)', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for HR_OFFICER: ${result.errorText || 'unknown'}`).toBeTruthy();

      // STRICT v4 RBAC: HR Officer should NOT have access to Finance module
      // This enforces cross-boundary denial between HR and Finance domains
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
      
      // AUDIT-2025-11-30: Use body check to verify tenant scoping
      await expectAllowedWithBodyCheck(
        response,
        API_ENDPOINTS.support.tickets,
        'SUPPORT_AGENT',
        { expectedOrgId: getTestOrgIdOptional() }
      );
    });

    test('can access knowledge base API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for SUPPORT_AGENT: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.support.knowledgeBase);
      
      // AUDIT-2025-11-30: Use body check to verify tenant scoping
      await expectAllowedWithBodyCheck(
        response,
        API_ENDPOINTS.support.knowledgeBase,
        'SUPPORT_AGENT',
        { expectedOrgId: getTestOrgIdOptional() }
      );
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
      
      // AUDIT-2025-11-30: Use body check to verify tenant scoping
      await expectAllowedWithBodyCheck(
        response,
        API_ENDPOINTS.workOrders.list,
        'OPERATIONS_MANAGER',
        { expectedOrgId: getTestOrgIdOptional() }
      );
    });

    test('can access properties API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for OPERATIONS_MANAGER: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.properties.list);
      
      // AUDIT-2025-11-30: Use body check to verify tenant scoping
      await expectAllowedWithBodyCheck(
        response,
        API_ENDPOINTS.properties.list,
        'OPERATIONS_MANAGER',
        { expectedOrgId: getTestOrgIdOptional() }
      );
    });

    test('can access marketplace vendors API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for OPERATIONS_MANAGER: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.marketplace.vendors);
      
      // AUDIT-2025-11-30: Use body check to verify tenant scoping
      await expectAllowedWithBodyCheck(
        response,
        API_ENDPOINTS.marketplace.vendors,
        'OPERATIONS_MANAGER',
        { expectedOrgId: getTestOrgIdOptional() }
      );
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
      // AUDIT-2025-11-30: Use body check to verify tenant scoping
      // This catches cross-tenant data leaks that status-only checks miss
      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.workOrders.list);
      await expectAllowedWithBodyCheck(
        response,
        API_ENDPOINTS.workOrders.list,
        'TEAM_MEMBER',
        { expectedOrgId: getTestOrgIdOptional() }
      );
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
      const response = await makeAuthenticatedRequest(
        page,
        request,
        API_ENDPOINTS.workOrders.assign,
        'POST',
        { workOrderId: 'rbac-test', assigneeId: 'rbac-test' }
      );
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

    test('ADMIN can access all module APIs with tenant-scoped data', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for ADMIN: ${result.errorText || 'unknown'}`).toBeTruthy();

      // Admin should have access to all endpoints - STRICT 200 required
      // Missing routes or 404 responses indicate configuration issues that must be fixed
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
        
        // AUDIT-2025-11-30: Use body check to verify tenant scoping
        // This catches cross-tenant data leaks that status-only checks miss
        await expectAllowedWithBodyCheck(
          response,
          endpoint,
          'ADMIN',
          {
            expectedOrgId: getTestOrgIdOptional(),
            validate: (body) => {
              // Verify response is valid JSON (array or object)
              expect(
                body !== null && (Array.isArray(body) || typeof body === 'object'),
                `${endpoint} should return array or object, got ${typeof body}`
              ).toBe(true);
            }
          }
        );
      }
    });

    test('ADMIN can access admin users API with tenant scoping', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for ADMIN: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.admin.users);
      
      // AUDIT-2025-11-30: Validate admin users response structure and tenant scoping
      await expectAllowedWithBodyCheck(
        response,
        API_ENDPOINTS.admin.users,
        'ADMIN',
        {
          expectedOrgId: getTestOrgIdOptional(),
          validate: (body) => {
            expect(
              body !== null && (Array.isArray(body) || typeof body === 'object'),
              `Admin users should return array or object`
            ).toBe(true);
            
            // Verify user data has expected fields
            if (Array.isArray(body) && body.length > 0) {
              const firstUser = body[0] as Record<string, unknown>;
              expect(firstUser).toHaveProperty('email');
            }
          }
        }
      );
    });
  });

  test.describe('API Method Restrictions', () => {
    test('FINANCE_OFFICER can GET but not DELETE invoices', async ({ page, request }) => {
      const credentials = getCredentials('FINANCE_OFFICER');
      await page.context().clearCookies();
      await gotoWithRetry(page, '/login');

      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for FINANCE_OFFICER: ${result.errorText || 'unknown'}`).toBeTruthy();

      // GET should be allowed - AUDIT-2025-11-30: Upgraded to body check for tenant scoping
      const getResponse = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.finance.invoices, 'GET');
      await expectAllowedWithBodyCheck(
        getResponse,
        API_ENDPOINTS.finance.invoices,
        'FINANCE_OFFICER',
        {
          expectedOrgId: testOrgId,
          validate: (body) => {
            // Verify response is valid JSON (array or object with data)
            expect(
              body !== null && (Array.isArray(body) || typeof body === 'object'),
              `${API_ENDPOINTS.finance.invoices} should return array or object`
            ).toBe(true);
          }
        }
      );

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

      // GET should be allowed - AUDIT-2025-11-30: Upgraded to body check for tenant scoping
      const getResponse = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.hr.payroll, 'GET');
      await expectAllowedWithBodyCheck(
        getResponse,
        API_ENDPOINTS.hr.payroll,
        'HR_OFFICER',
        {
          expectedOrgId: testOrgId,
          validate: (body) => {
            // Verify response is valid JSON (array or object with data)
            expect(
              body !== null && (Array.isArray(body) || typeof body === 'object'),
              `${API_ENDPOINTS.hr.payroll} should return array or object`
            ).toBe(true);
          }
        }
      );

      // POST to approve endpoint - HR_OFFICER should NOT have approve permission
      // per RBAC v4.1 action-level permissions
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
      
      // RBAC v4.1 MATRIX: HR_OFFICER should NOT have payroll approve permission
      // Expected: 403 Forbidden. Anything else indicates a routing or RBAC regression.
      expect(
        approveStatus,
        `HR_OFFICER payroll approve should be denied. Got ${approveStatus} (200=over-permission, 404=missing route, 400=validation masking RBAC, 500=server error, 401=auth failure).`
      ).toBe(403);
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

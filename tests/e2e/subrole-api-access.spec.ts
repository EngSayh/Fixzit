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
  // AUDIT-2025-12-01: Clarified message to match actual behavior
  // Tests will FAIL (not skip) unless ALLOW_MISSING_TEST_ORG_ID=true
  console.info(
    'ℹ️  INFO: TEST_ORG_ID not set.\n' +
    'Tenant scoping assertions will FAIL unless you either:\n' +
    '  1. Set TEST_ORG_ID in .env.local (recommended), OR\n' +
    '  2. Set ALLOW_MISSING_TEST_ORG_ID=true to bypass (not recommended)\n' +
    'For full multi-tenancy validation, configure TEST_ORG_ID.'
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
 * SCOPED ROLES that require user-level RBAC assertions.
 * These roles should only see data assigned/owned by them, not all org data.
 * 
 * AUDIT-2025-12-01: TEST_${ROLE}_USER_ID is REQUIRED for these roles in CI.
 * Without it, row-level validators pass even if API returns over-broad data.
 */
const SCOPED_ROLES: SubRoleKey[] = ['TEAM_MEMBER', 'SUPPORT_AGENT'];

/**
 * Get test credentials for a sub-role.
 * Throws immediately if environment variables are not configured.
 * 
 * AUDIT-2025-12-01: For SCOPED_ROLES (TEAM_MEMBER, SUPPORT_AGENT), userId is REQUIRED
 * in CI to enable row-level RBAC assertions. Without userId, tests would pass
 * even if the API returns all org data instead of user-scoped data.
 */
function getCredentials(subRole: SubRoleKey): TestCredentials {
  const creds = getRequiredTestCredentials(subRole);
  
  // AUDIT-2025-12-01: Enforce userId for scoped roles
  // This ensures row-level validators actually assert user ownership
  if (SCOPED_ROLES.includes(subRole) && !creds.userId) {
    if (IS_CI && !IS_FORK_OR_MISSING_SECRETS) {
      // CI: Hard fail - USER_ID is required for row-level RBAC assertions
      expect(
        creds.userId,
        `TEST_${subRole}_USER_ID is REQUIRED in CI for row-level RBAC assertions.\n` +
        `Without it, ${subRole} tests pass even if API returns all org data.\n\n` +
        `ACTION: Add TEST_${subRole}_USER_ID to GitHub Secrets.\n` +
        `Value should be the MongoDB _id of the test user for this role.`
      ).toBeTruthy();
    } else {
      // LOCAL: Warn that row-level RBAC checks are disabled
      // AUDIT-2025-12-01: Align local visibility with CI - don't silently skip checks
      console.warn(
        `⚠️  ROW-LEVEL RBAC DISABLED for ${subRole}: TEST_${subRole}_USER_ID not set.\n` +
        `   Without it, ownership/assignment checks will NOT run.\n` +
        `   Set TEST_${subRole}_USER_ID in .env.local to enable full RBAC coverage.`
      );
    }
  }
  
  return creds;
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
     * Set to false ONLY for endpoints that legitimately return tenant-agnostic data
     * (e.g., system configs, public metadata).
     * 
     * @default true when expectedOrgId is provided (fail-closed security pattern)
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

  // AUDIT-2025-11-30: Enhanced tenant/org_id validation
  // - Checks BOTH org_id (snake_case) and orgId (camelCase)
  // - Recursively walks ALL nested objects/arrays (skips metadata: meta/pagination/_metadata/__v)
  // - Catches tenant leaks in any response shape, not just data/items/results
  // - Defaults requireOrgIdPresence to TRUE when expectedOrgId is provided (fail-closed)
  if (options?.expectedOrgId) {
    // SECURITY: Default to requiring presence when checking tenant ID
    // This ensures APIs that omit org_id entirely fail instead of passing silently.
    // Callers can opt-out with requireOrgIdPresence: false for tenant-agnostic endpoints.
    const requirePresence = options.requireOrgIdPresence ?? true;
    
    /**
     * Recursively verifies tenant ID on objects and walks ALL nested objects/arrays.
     * Skips metadata-only keys (meta, pagination, _metadata, __v) that never contain
     * tenant-scoped business data.
     * 
     * Handles any API response shape:
     * - Direct object: { org_id: "...", ... }
     * - Array: [{ org_id: "..." }, ...]
     * - Wrapped: { data: [...] }, { items: [...] }, { results: [...] }
     * - Paginated: { data: { items: [...] } }
     * - Custom nested: { summary: { org_id: "..." }, user: {...}, rows: [...] }
     */
    const walkAndVerifyOrgId = (value: unknown, path = 'body'): void => {
      if (!value || typeof value !== 'object') return;
      
      // Handle arrays - verify each item
      if (Array.isArray(value)) {
        value.forEach((item, idx) => walkAndVerifyOrgId(item, `${path}[${idx}]`));
        return;
      }
      
      const v = value as Record<string, unknown>;
      
      // Check both org_id and orgId - Mongoose uses camelCase, some APIs use snake_case
      const foundOrgId = v.org_id ?? v.orgId;
      
      // AUDIT-2025-11-30: Enforce org_id PRESENCE (fail-closed security pattern)
      // This catches APIs that omit tenant identifiers entirely
      if (requirePresence && foundOrgId === undefined) {
        // Before failing, check if this is a wrapper object (no org_id expected at wrapper level)
        const isWrapperOnly = ['data', 'items', 'results', 'meta', 'pagination'].some(
          key => key in v && !('org_id' in v) && !('orgId' in v)
        );
        
        if (!isWrapperOnly) {
          expect(
            false,
            `TENANT ID MISSING: ${endpoint} at ${path} has no org_id or orgId field.\n` +
            `Role: ${role}\n` +
            `Expected: org_id or orgId field with value ${options.expectedOrgId}\n\n` +
            `SECURITY RISK: APIs that omit tenant identifiers can leak cross-tenant data.\n` +
            `ACTION:\n` +
            `  • If this endpoint SHOULD return tenant-scoped data: Fix backend to include org_id\n` +
            `  • If this endpoint is tenant-agnostic by design: Set requireOrgIdPresence: false`
          ).toBe(true);
        }
      }
      
      // Verify org_id value when present
      if (foundOrgId !== undefined) {
        expect(
          String(foundOrgId),
          `TENANT MISMATCH at ${path}: Expected org_id/orgId=${options.expectedOrgId}, got ${foundOrgId}\n` +
          `Endpoint: ${endpoint}\n` +
          `Role: ${role}\n\n` +
          `SECURITY RISK: Cross-tenant data leak detected!`
        ).toBe(options.expectedOrgId);
      }
      
      // AUDIT-2025-11-30: Recurse into ALL nested objects to catch tenant leaks
      // regardless of the key name (summary, payload, user, rows, etc.)
      // Only skip pure metadata keys that never contain tenant-scoped business data.
      const METADATA_ONLY_KEYS = new Set(['meta', 'pagination', '_metadata', '__v']);
      
      for (const [key, val] of Object.entries(v)) {
        // Skip non-objects and metadata-only keys
        if (!val || typeof val !== 'object') continue;
        if (METADATA_ONLY_KEYS.has(key)) continue;
        
        // Recurse into this nested object/array
        walkAndVerifyOrgId(val, `${path}.${key}`);
      }
    };
    
    walkAndVerifyOrgId(body);
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

/**
 * AUDIT-2025-11-30: Assertion helper for POST/PUT/PATCH write operations.
 * 
 * Write operations have different success patterns than reads:
 * - 200/201: Resource created/updated - MUST validate tenant scoping on response
 * - 400/422: Validation error - RBAC passed, but data invalid (acceptable for RBAC tests)
 * - 403: RBAC denied - test failure for allowed roles
 * - 401: Auth failure - test failure
 * 
 * This helper ensures that:
 * 1. RBAC allows the operation (not 401/403)
 * 2. If resource is returned (200/201), tenant scoping is validated
 * 3. Validation errors (400/422) are acceptable for RBAC-focused tests
 * 
 * @param response - Playwright API response
 * @param endpoint - API endpoint path
 * @param role - Role name for error messages
 * @param options - Validation options including expectedOrgId for tenant checks
 */
async function expectWriteAllowedWithTenantCheck(
  response: { status: () => number; json: () => Promise<unknown>; text: () => Promise<string> },
  endpoint: string,
  role: string,
  options?: {
    expectedOrgId?: string;
    requireOrgIdPresence?: boolean;
    validate?: (body: unknown) => void;
  }
): Promise<void> {
  const status = response.status();
  
  // First, verify RBAC didn't block the request
  expect(
    [200, 201, 400, 422].includes(status),
    `${role} POST/PUT to ${endpoint} got ${status}.\n` +
    `Expected 200/201 (success), 400/422 (validation - RBAC passed).\n` +
    `DIAGNOSIS:\n` +
    `  • 403: RBAC incorrectly denying write access\n` +
    `  • 401: Authentication failure\n` +
    `  • 404: Route missing or guard returns 404 instead of 403\n` +
    `  • 500: Server error\n` +
    `ACTION: Check RBAC configuration for ${role} write permissions on ${endpoint}.`
  ).toBe(true);
  
  // For validation errors (400/422), RBAC passed but data was invalid
  // This is acceptable for RBAC-focused tests with minimal payloads
  if (status === 400 || status === 422) {
    // Log for visibility, but don't fail - RBAC passed
    console.info(
      `ℹ️  ${role} POST/PUT to ${endpoint} returned ${status} (validation error).\n` +
      `RBAC allowed the request, but payload was invalid. This is expected for RBAC tests.`
    );
    return;
  }
  
  // For 200/201, validate tenant scoping on the response
  // This catches cross-tenant write bugs where wrong org_id is assigned
  if (status === 200 || status === 201) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      // Some write endpoints return empty body on success - that's OK
      const raw = await response.text();
      if (raw.trim() === '' || raw === 'null') {
        console.info(
          `ℹ️  ${role} POST/PUT to ${endpoint} returned ${status} with empty body.\n` +
          `Cannot validate tenant scoping on empty response.`
        );
        return;
      }
      throw new Error(`Failed to parse response body as JSON: ${raw}`);
    }
    
    // AUDIT-2025-11-30: Validate tenant scoping on created/updated resource
    // This catches cross-tenant write bugs where:
    // - Backend assigns wrong org_id to created resource
    // - Backend omits org_id entirely on response
    if (options?.expectedOrgId && body && typeof body === 'object') {
      const requirePresence = options.requireOrgIdPresence ?? true;
      const b = body as Record<string, unknown>;
      
      // Check for org_id in response (direct or nested in data wrapper)
      const directOrgId = b.org_id ?? b.orgId;
      const nestedOrgId = (b.data as Record<string, unknown>)?.org_id ?? 
                          (b.data as Record<string, unknown>)?.orgId;
      const foundOrgId = directOrgId ?? nestedOrgId;
      
      if (requirePresence && foundOrgId === undefined) {
        expect(
          false,
          `TENANT ID MISSING on write response: ${endpoint}\n` +
          `Role: ${role}, Status: ${status}\n` +
          `Expected: org_id or orgId field with value ${options.expectedOrgId}\n\n` +
          `SECURITY RISK: Created/updated resource may not be tenant-scoped.\n` +
          `ACTION:\n` +
          `  • If write response SHOULD include org_id: Fix backend\n` +
          `  • If response intentionally omits org_id: Set requireOrgIdPresence: false`
        ).toBe(true);
      }
      
      if (foundOrgId !== undefined) {
        expect(
          String(foundOrgId),
          `TENANT MISMATCH on write: ${endpoint}\n` +
          `Role: ${role}, Status: ${status}\n` +
          `Expected org_id: ${options.expectedOrgId}, got: ${foundOrgId}\n\n` +
          `SECURITY RISK: Cross-tenant write detected! Resource assigned to wrong tenant.`
        ).toBe(options.expectedOrgId);
      }
    }
    
    // Run custom validator if provided
    if (options?.validate && body) {
      options.validate(body);
    }
  }
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
 * ROW-LEVEL VALIDATION HELPERS
 * 
 * AUDIT-2025-11-30: Added per-domain validators to enforce STRICT v4.1 data isolation
 * beyond just org_id tenant scoping. These check that data returned is appropriately
 * scoped to the user's permissions (assigned work orders, accessible properties, etc.)
 * 
 * USAGE PATTERN - When to pass expectedUserId:
 * 
 * | Role              | Work Orders         | Properties          | Support Tickets    |
 * |-------------------|---------------------|---------------------|--------------------|
 * | OPERATIONS_MANAGER| NO userId (sees all)| NO userId (sees all)| N/A                |
 * | TEAM_MEMBER       | YES userId (own)    | N/A                 | N/A                |
 * | SUPPORT_AGENT     | N/A                 | N/A                 | YES userId (queue) |
 * | FINANCE_OFFICER   | N/A                 | N/A                 | N/A                |
 * | HR_OFFICER        | N/A                 | N/A                 | N/A                |
 * | ADMIN             | NO userId (sees all)| NO userId (sees all)| NO userId (all)    |
 * 
 * - Management roles (OPERATIONS_MANAGER, ADMIN) see all data within their org → omit expectedUserId
 * - Individual contributors see only their assigned/owned data → pass credentials.userId
 * - If TEST_${ROLE}_USER_ID env var is set, it's available via credentials.userId
 * 
 * Best-Practice Pattern: Structural validation ensures required fields exist,
 * while userId assertions catch intra-tenant over-permission leaks.
 */

/**
 * Validate work order row-level fields.
 * Ensures work orders have required assignment/property fields for visibility scoping.
 * 
 * @param items - Array of work order objects from API response
 * @param expectedUserId - If provided, asserts that assignment fields match this user
 */
function validateWorkOrderStructure(items: unknown[], expectedUserId?: string): void {
  items.forEach((item, idx) => {
    const wo = item as Record<string, unknown>;
    
    // Work orders MUST have status field for visibility logic
    expect(
      wo.status !== undefined,
      `Work order [${idx}] missing 'status' field - required for visibility filtering`
    ).toBe(true);
    
    // RBAC v4.1: Work orders should have assignment or property_id for user-level filtering
    // At least one of these should be present for proper row-level access control
    const assignedTo = wo.assigned_to ?? wo.assigned_to_user_id ?? wo.assignee_id;
    const hasAssignment = assignedTo !== undefined;
    const hasProperty = wo.property_id !== undefined || wo.property !== undefined;
    
    expect(
      hasAssignment || hasProperty,
      `Work order [${idx}] missing both assignment fields (assigned_to/assigned_to_user_id) and property fields (property_id). ` +
      `Row-level RBAC requires at least one for user-scoped visibility.`
    ).toBe(true);
    
    // USER-LEVEL ASSERTION: If expectedUserId provided, verify work order belongs to this user
    // This catches intra-tenant overexposure (seeing other users' work orders)
    if (expectedUserId && hasAssignment) {
      expect(
        String(assignedTo),
        `Work order [${idx}] RBAC violation: assigned to ${assignedTo}, expected ${expectedUserId}.\n` +
        `User should only see work orders assigned to them or their properties.`
      ).toBe(expectedUserId);
    }
  });
}

/**
 * Validate support ticket row-level fields.
 * Ensures tickets have requester/assignee fields for agent visibility scoping.
 * 
 * @param items - Array of ticket objects from API response
 * @param expectedUserId - If provided, asserts that requester/assignee fields match this user
 */
function validateSupportTicketStructure(items: unknown[], expectedUserId?: string): void {
  items.forEach((item, idx) => {
    const ticket = item as Record<string, unknown>;
    
    // Tickets MUST have status for queue/assignment logic
    expect(
      ticket.status !== undefined,
      `Support ticket [${idx}] missing 'status' field - required for queue visibility`
    ).toBe(true);
    
    // RBAC v4.1: Support tickets should have requester OR assignee for agent visibility
    const requester = ticket.requester ?? ticket.requester_id ?? ticket.created_by;
    const assignee = ticket.assignee ?? ticket.assigned_to ?? ticket.agent_id;
    const hasRequester = requester !== undefined;
    const hasAssignee = assignee !== undefined;
    
    expect(
      hasRequester || hasAssignee,
      `Support ticket [${idx}] missing both requester and assignee fields. ` +
      `Row-level RBAC requires at least one for agent-scoped visibility.`
    ).toBe(true);
    
    // USER-LEVEL ASSERTION: If expectedUserId provided, verify ticket is visible to this agent
    // Agent should see tickets assigned to them OR where they are the requester
    if (expectedUserId && (hasRequester || hasAssignee)) {
      const userCanSee = String(requester) === expectedUserId || String(assignee) === expectedUserId;
      expect(
        userCanSee,
        `Support ticket [${idx}] RBAC violation: requester=${requester}, assignee=${assignee}, expected user ${expectedUserId}.\n` +
        `Agent should only see tickets assigned to them or created by them.`
      ).toBe(true);
    }
  });
}

/**
 * Validate property row-level fields.
 * Ensures properties have owner/manager fields for user visibility scoping.
 * 
 * @param items - Array of property objects from API response
 * @param expectedUserId - If provided, asserts that owner/manager fields match this user
 */
function validatePropertyStructure(items: unknown[], expectedUserId?: string): void {
  items.forEach((item, idx) => {
    const prop = item as Record<string, unknown>;
    
    // Properties MUST have name/address for identification
    const hasIdentifier = prop.name !== undefined || prop.address !== undefined || prop.title !== undefined;
    expect(
      hasIdentifier,
      `Property [${idx}] missing identifier field (name/address/title)`
    ).toBe(true);
    
    // RBAC v4.1: Properties should have owner or manager for visibility scoping
    const owner = prop.owner_id ?? prop.property_owner_id ?? prop.owner;
    const manager = prop.manager_id ?? prop.property_manager_id ?? prop.managed_by;
    const hasOwner = owner !== undefined;
    const hasManager = manager !== undefined;
    
    // AUDIT-2025-11-30: FAIL instead of warn for consistency with other validators
    // Properties without ownership/management linkage break row-level RBAC
    expect(
      hasOwner || hasManager,
      `Property [${idx}] missing both owner and manager fields (owner_id/property_owner_id/manager_id). ` +
      `Row-level RBAC requires at least one for visibility scoping.`
    ).toBe(true);
    
    // USER-LEVEL ASSERTION: If expectedUserId provided, verify property belongs to this user
    if (expectedUserId && (hasOwner || hasManager)) {
      const userCanSee = String(owner) === expectedUserId || String(manager) === expectedUserId;
      expect(
        userCanSee,
        `Property [${idx}] RBAC violation: owner=${owner}, manager=${manager}, expected user ${expectedUserId}.\n` +
        `User should only see properties they own or manage.`
      ).toBe(true);
    }
  });
}

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
        { expectedOrgId: getTestOrgIdOptional(), requireOrgIdPresence: true }
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
        { expectedOrgId: getTestOrgIdOptional(), requireOrgIdPresence: true }
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
        { expectedOrgId: getTestOrgIdOptional(), requireOrgIdPresence: true }
      );
    });

    // AUDIT-2025-11-30: Added payments endpoint - was missing from positive coverage
    test('can access finance payments API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for FINANCE_OFFICER: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.finance.payments);
      await expectAllowedWithBodyCheck(
        response,
        API_ENDPOINTS.finance.payments,
        'FINANCE_OFFICER',
        { expectedOrgId: getTestOrgIdOptional(), requireOrgIdPresence: true }
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
        { expectedOrgId: getTestOrgIdOptional(), requireOrgIdPresence: true }
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
        { expectedOrgId: getTestOrgIdOptional(), requireOrgIdPresence: true }
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
        { expectedOrgId: getTestOrgIdOptional(), requireOrgIdPresence: true }
      );
    });

    // AUDIT-2025-11-30: Added leaves endpoint - was missing from positive coverage
    test('can access HR leaves API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for HR_OFFICER: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.hr.leaves);
      await expectAllowedWithBodyCheck(
        response,
        API_ENDPOINTS.hr.leaves,
        'HR_OFFICER',
        { expectedOrgId: getTestOrgIdOptional(), requireOrgIdPresence: true }
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
      
      // AUDIT-2025-11-30: Use body check to verify tenant scoping + row-level structure
      await expectAllowedWithBodyCheck(
        response,
        API_ENDPOINTS.support.tickets,
        'SUPPORT_AGENT',
        {
          expectedOrgId: getTestOrgIdOptional(),
          requireOrgIdPresence: true,
          validate: (body) => {
            expect(Array.isArray(body), 'Support tickets list should return an array').toBe(true);
            // Pass credentials.userId to verify agent sees only tickets assigned to them
            if (Array.isArray(body) && body.length > 0) {
              validateSupportTicketStructure(body, credentials.userId);
            }
          }
        }
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
        { expectedOrgId: getTestOrgIdOptional(), requireOrgIdPresence: true }
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
      
      // AUDIT-2025-11-30: Use body check to verify tenant scoping + row-level structure
      await expectAllowedWithBodyCheck(
        response,
        API_ENDPOINTS.workOrders.list,
        'OPERATIONS_MANAGER',
        {
          expectedOrgId: getTestOrgIdOptional(),
          requireOrgIdPresence: true,
          validate: (body) => {
            expect(Array.isArray(body), 'Work orders list should return an array').toBe(true);
            // OPERATIONS_MANAGER may see all org work orders, so don't enforce user-level
            // Only structural validation for manager role
            if (Array.isArray(body) && body.length > 0) {
              validateWorkOrderStructure(body);
            }
          }
        }
      );
    });

    test('can access properties API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for OPERATIONS_MANAGER: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.properties.list);
      
      // AUDIT-2025-11-30: Use body check to verify tenant scoping + row-level structure
      await expectAllowedWithBodyCheck(
        response,
        API_ENDPOINTS.properties.list,
        'OPERATIONS_MANAGER',
        {
          expectedOrgId: getTestOrgIdOptional(),
          requireOrgIdPresence: true,
          validate: (body) => {
            expect(Array.isArray(body), 'Properties list should return an array').toBe(true);
            // OPERATIONS_MANAGER may see all org properties, so don't enforce user-level
            // Only structural validation for manager role
            if (Array.isArray(body) && body.length > 0) {
              validatePropertyStructure(body);
            }
          }
        }
      );
    });

    // AUDIT-2025-11-30: Added properties.units endpoint - was missing from positive coverage
    test('can access properties units API', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for OPERATIONS_MANAGER: ${result.errorText || 'unknown'}`).toBeTruthy();

      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.properties.units);
      
      await expectAllowedWithBodyCheck(
        response,
        API_ENDPOINTS.properties.units,
        'OPERATIONS_MANAGER',
        {
          expectedOrgId: getTestOrgIdOptional(),
          requireOrgIdPresence: true,
          validate: (body) => {
            // Units list should return array
            expect(
              body !== null && (Array.isArray(body) || typeof body === 'object'),
              'Properties units should return array or object'
            ).toBe(true);
          }
        }
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
        { expectedOrgId: getTestOrgIdOptional(), requireOrgIdPresence: true }
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
      // AUDIT-2025-11-30: Use body check to verify tenant scoping + row-level structure
      // This catches cross-tenant data leaks AND missing row-level RBAC fields
      const response = await makeAuthenticatedRequest(page, request, API_ENDPOINTS.workOrders.list);
      await expectAllowedWithBodyCheck(
        response,
        API_ENDPOINTS.workOrders.list,
        'TEAM_MEMBER',
        {
          expectedOrgId: getTestOrgIdOptional(),
          requireOrgIdPresence: true,
          validate: (body) => {
            // Verify response is an array (list endpoint)
            expect(Array.isArray(body), 'Work orders list should return an array').toBe(true);
            
            // Row-level validation: ensure work orders have required fields for RBAC
            // Pass credentials.userId to verify user only sees their assigned work orders
            if (Array.isArray(body) && body.length > 0) {
              validateWorkOrderStructure(body, credentials.userId);
            }
          }
        }
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

    /**
     * AUDIT-2025-11-30: Added verb-level denial tests for unprivileged roles.
     * These verify that TEAM_MEMBER cannot perform write operations even though
     * they can read work orders. Tests POST to workOrders.create and workOrders.assign.
     */
    test('TEAM_MEMBER cannot POST to work orders create (verb denial)', async ({ page, request }) => {
      const credentials = getCredentials('TEAM_MEMBER');
      await page.context().clearCookies();
      await gotoWithRetry(page, '/login');

      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for TEAM_MEMBER: ${result.errorText || 'unknown'}`).toBeTruthy();

      // TEAM_MEMBER should NOT be able to create work orders - only OPERATIONS_MANAGER/ADMIN
      const response = await makeAuthenticatedRequest(
        page,
        request,
        API_ENDPOINTS.workOrders.create,
        'POST',
        { title: 'RBAC-TEST-UNAUTHORIZED', description: 'Should be denied', _rbacTest: true }
      );
      expectDenied(response, API_ENDPOINTS.workOrders.create, 'TEAM_MEMBER');
    });

    test('TEAM_MEMBER cannot POST to work orders assign (verb denial)', async ({ page, request }) => {
      const credentials = getCredentials('TEAM_MEMBER');
      await page.context().clearCookies();
      await gotoWithRetry(page, '/login');

      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for TEAM_MEMBER: ${result.errorText || 'unknown'}`).toBeTruthy();

      // TEAM_MEMBER should NOT be able to assign work orders
      const response = await makeAuthenticatedRequest(
        page,
        request,
        API_ENDPOINTS.workOrders.assign,
        'POST',
        { workOrderId: 'rbac-test', assigneeId: 'rbac-test' }
      );
      expectDenied(response, API_ENDPOINTS.workOrders.assign, 'TEAM_MEMBER');
    });

    test('FINANCE_OFFICER cannot POST to marketplace bids (verb denial)', async ({ page, request }) => {
      const credentials = getCredentials('FINANCE_OFFICER');
      await page.context().clearCookies();
      await gotoWithRetry(page, '/login');

      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for FINANCE_OFFICER: ${result.errorText || 'unknown'}`).toBeTruthy();

      // FINANCE_OFFICER should NOT be able to submit marketplace bids
      const response = await makeAuthenticatedRequest(
        page,
        request,
        API_ENDPOINTS.marketplace.bids,
        'POST',
        { vendor_id: 'rbac-test', amount: 0, _rbacTest: true }
      );
      expectDenied(response, API_ENDPOINTS.marketplace.bids, 'FINANCE_OFFICER');
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
      // AUDIT-2025-11-30: Expanded to cover ALL defined API_ENDPOINTS for comprehensive RBAC/tenancy testing
      const allEndpoints = [
        // Finance module (all 4 endpoints)
        API_ENDPOINTS.finance.invoices,
        API_ENDPOINTS.finance.budgets,
        API_ENDPOINTS.finance.expenses,
        API_ENDPOINTS.finance.payments,
        // HR module (all 4 endpoints)
        API_ENDPOINTS.hr.employees,
        API_ENDPOINTS.hr.payroll,
        API_ENDPOINTS.hr.attendance,
        API_ENDPOINTS.hr.leaves,
        // Support module (all 2 endpoints)
        API_ENDPOINTS.support.tickets,
        API_ENDPOINTS.support.knowledgeBase,
        // Work Orders module (list only - create/assign tested separately for verb coverage)
        API_ENDPOINTS.workOrders.list,
        // Marketplace module (all 2 endpoints)
        API_ENDPOINTS.marketplace.vendors,
        API_ENDPOINTS.marketplace.bids,
        // Properties module (all 2 endpoints)
        API_ENDPOINTS.properties.list,
        API_ENDPOINTS.properties.units,
        // Admin module (users tested separately, settings added here)
        API_ENDPOINTS.admin.settings,
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
            requireOrgIdPresence: true,
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
          requireOrgIdPresence: true,
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

    /**
     * AUDIT-2025-11-30: Added verb-level tests for ADMIN write operations.
     * Previous coverage was GET-heavy; these tests verify POST/PUT permissions
     * for work orders and marketplace bids to catch RBAC/tenancy regressions on writes.
     * 
     * AUDIT-2025-11-30 UPDATE: Now uses expectWriteAllowedWithTenantCheck to validate
     * org_id on successful responses, catching cross-tenant write bugs.
     */
    test('ADMIN can POST to work orders API (create) with tenant validation', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for ADMIN: ${result.errorText || 'unknown'}`).toBeTruthy();

      // POST to work orders - Admin should be allowed to create
      // Using minimal payload to test RBAC, not data validation
      const response = await makeAuthenticatedRequest(
        page, 
        request, 
        API_ENDPOINTS.workOrders.create, 
        'POST',
        { 
          title: 'RBAC-TEST-ADMIN-CREATE',
          description: 'E2E RBAC test - safe to delete',
          _rbacTest: true // Flag for cleanup scripts
        }
      );
      
      // AUDIT-2025-11-30: Validate tenant scoping on write response
      // This catches cross-tenant write bugs where backend assigns wrong org_id
      await expectWriteAllowedWithTenantCheck(
        response,
        API_ENDPOINTS.workOrders.create,
        'ADMIN',
        {
          expectedOrgId: getTestOrgIdOptional(),
          // For POST responses that return the created resource, validate org_id
          // Set to false only if this endpoint intentionally omits org_id in response
          requireOrgIdPresence: true,
        }
      );
    });

    test('ADMIN can POST to marketplace bids API with tenant validation', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for ADMIN: ${result.errorText || 'unknown'}`).toBeTruthy();

      // POST to marketplace bids - Admin should be allowed
      const response = await makeAuthenticatedRequest(
        page, 
        request, 
        API_ENDPOINTS.marketplace.bids, 
        'POST',
        { 
          vendor_id: 'rbac-test-vendor',
          amount: 0,
          _rbacTest: true
        }
      );
      
      // AUDIT-2025-11-30: Validate tenant scoping on write response
      await expectWriteAllowedWithTenantCheck(
        response,
        API_ENDPOINTS.marketplace.bids,
        'ADMIN',
        {
          expectedOrgId: getTestOrgIdOptional(),
          requireOrgIdPresence: true,
        }
      );
    });

    /**
     * AUDIT-2025-11-30: Added workOrders.assign test for comprehensive write coverage.
     * This endpoint requires both RBAC check AND tenant scoping on assignment.
     */
    test('ADMIN can POST to work orders assign API with tenant validation', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for ADMIN: ${result.errorText || 'unknown'}`).toBeTruthy();

      // POST to assign endpoint - Admin should be allowed
      const response = await makeAuthenticatedRequest(
        page, 
        request, 
        API_ENDPOINTS.workOrders.assign, 
        'POST',
        { 
          workOrderId: 'rbac-test-wo-id',
          assigneeId: 'rbac-test-assignee',
          _rbacTest: true
        }
      );
      
      await expectWriteAllowedWithTenantCheck(
        response,
        API_ENDPOINTS.workOrders.assign,
        'ADMIN',
        {
          expectedOrgId: getTestOrgIdOptional(),
          requireOrgIdPresence: true,
        }
      );
    });

    /**
     * AUDIT-2025-11-30: Added admin.settings update test for comprehensive write coverage.
     */
    test('ADMIN can PUT to admin settings API with tenant validation', async ({ page, request }) => {
      const result = await attemptLogin(page, credentials.email, credentials.password);
      expect(result.success, `Login failed for ADMIN: ${result.errorText || 'unknown'}`).toBeTruthy();

      // PUT to settings endpoint - Admin should be allowed
      const response = await makeAuthenticatedRequest(
        page, 
        request, 
        API_ENDPOINTS.admin.settings, 
        'PUT',
        { 
          _rbacTest: true,
          // Minimal settings payload - actual validation may require more fields
          notifications: { email: true }
        }
      );
      
      await expectWriteAllowedWithTenantCheck(
        response,
        API_ENDPOINTS.admin.settings,
        'ADMIN',
        {
          expectedOrgId: getTestOrgIdOptional(),
          // Settings may not return org_id in response - adjust if needed
          requireOrgIdPresence: false,
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
          requireOrgIdPresence: true,
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
          requireOrgIdPresence: true,
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
  /**
   * Unauthenticated requests MUST return 401 Unauthorized.
   * - 401 = "Who are you?" (no valid authentication)
   * - 403 = "I know who you are, but you can't do this" (authenticated but not authorized)
   * 
   * AUDIT-2025-12-01: Strengthened from [401, 403] to strict 401.
   * If we accept 403 here, we're masking potential middleware misconfigurations
   * where auth checks run before session validation.
   */
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
      // Strict 401 requirement - unauthenticated is NOT the same as unauthorized
      expect(
        response.status(),
        `Unauthenticated request to ${endpoint} should return 401 (not 403 - that's for authenticated but unauthorized)`
      ).toBe(401);
    }
  });
});

/**
 * Regression tests for tenant validation helper behavior.
 * These verify that walkAndVerifyOrgId catches tenant leaks in any nested shape,
 * not just the common data/items/results wrappers.
 * 
 * AUDIT-2025-11-30: Added to lock in "all nested objects" traversal behavior
 * after expanding recursion from hardcoded keys to full Object.entries() walk.
 */
test.describe('Tenant Validation Helper Behavior', () => {
  // Mock response factory for testing
  const createMockResponse = (body: unknown) => ({
    status: () => 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });

  test('catches org_id mismatch in standard data wrapper', async () => {
    const wrongTenantBody = {
      data: [{ id: '1', org_id: 'wrong-tenant', name: 'Test' }],
    };
    
    const response = createMockResponse(wrongTenantBody);
    
    // This should fail because org_id in nested data doesn't match expected
    await expect(async () => {
      await expectAllowedWithBodyCheck(response, '/api/test', 'TEST_ROLE', {
        expectedOrgId: 'correct-tenant',
      });
    }).rejects.toThrow(/TENANT MISMATCH/);
  });

  test('catches org_id mismatch in items wrapper', async () => {
    // Tests the "items" wrapper which is in the allowed wrapper list
    const wrongTenantBody = {
      items: [{ id: '1', org_id: 'wrong-tenant', name: 'Test' }],
      meta: { page: 1 },
    };
    
    const response = createMockResponse(wrongTenantBody);
    
    await expect(async () => {
      await expectAllowedWithBodyCheck(response, '/api/test', 'TEST_ROLE', {
        expectedOrgId: 'correct-tenant',
      });
    }).rejects.toThrow(/TENANT MISMATCH/);
  });

  test('catches org_id mismatch in results wrapper', async () => {
    // Tests the "results" wrapper which is in the allowed wrapper list
    const wrongTenantBody = {
      results: [{ id: '1', org_id: 'wrong-tenant' }],
    };
    
    const response = createMockResponse(wrongTenantBody);
    
    await expect(async () => {
      await expectAllowedWithBodyCheck(response, '/api/test', 'TEST_ROLE', {
        expectedOrgId: 'correct-tenant',
      });
    }).rejects.toThrow(/TENANT MISMATCH/);
  });

  test('catches org_id mismatch in nested data.items structure', async () => {
    // Tests deeply nested paginated response
    const wrongTenantBody = {
      data: {
        items: [{ id: '1', org_id: 'wrong-tenant', name: 'Test' }],
        total: 1,
      },
    };
    
    const response = createMockResponse(wrongTenantBody);
    
    await expect(async () => {
      await expectAllowedWithBodyCheck(response, '/api/test', 'TEST_ROLE', {
        expectedOrgId: 'correct-tenant',
      });
    }).rejects.toThrow(/TENANT MISMATCH/);
  });

  test('skips metadata keys and does not require org_id in them', async () => {
    // meta, pagination, _metadata, __v should be skipped
    const validBody = {
      data: [{ id: '1', org_id: 'correct-tenant' }],
      meta: { page: 1, total: 100 }, // No org_id here - should be fine
      pagination: { next: '/api/test?page=2' }, // No org_id here - should be fine
    };
    
    const response = createMockResponse(validBody);
    
    // Should NOT throw - metadata keys are exempt
    await expectAllowedWithBodyCheck(response, '/api/test', 'TEST_ROLE', {
      expectedOrgId: 'correct-tenant',
    });
  });

  test('accepts matching org_id in various wrapper structures', async () => {
    const validBody = {
      data: [
        { id: '1', org_id: 'correct-tenant', name: 'Item 1' },
        { id: '2', org_id: 'correct-tenant', name: 'Item 2' },
      ],
      meta: { page: 1, total: 2 },
    };
    
    const response = createMockResponse(validBody);
    
    // Should NOT throw - org_id matches in all data items
    await expectAllowedWithBodyCheck(response, '/api/test', 'TEST_ROLE', {
      expectedOrgId: 'correct-tenant',
    });
  });

  test('accepts matching org_id in nested items structure', async () => {
    const validBody = {
      items: [{ org_id: 'correct-tenant', value: 42 }],
      pagination: { next: '/api/test?page=2' },
    };
    
    const response = createMockResponse(validBody);
    
    // Should NOT throw - org_id matches in items
    await expectAllowedWithBodyCheck(response, '/api/test', 'TEST_ROLE', {
      expectedOrgId: 'correct-tenant',
    });
  });

  /**
   * CRITICAL REGRESSION TEST: Non-allowlist key traversal
   * 
   * This test ensures the helper's "all nested objects" traversal catches
   * org_id mismatches under arbitrary keys (summary, payload, user, etc.)
   * that are NOT in the isWrapperOnly allowlist (data/items/results/meta/pagination).
   * 
   * If the helper ever regresses to only checking allowlisted wrapper keys,
   * this test will fail - preventing cross-tenant leaks in custom response shapes.
   */
  test('catches org_id mismatch under arbitrary non-allowlist key', async () => {
    // Top-level has correct org_id (satisfies presence check at body level)
    // But nested 'summary' key (not in allowlist) has wrong tenant
    const body = {
      org_id: 'correct-tenant',
      summary: { totalCount: 10, org_id: 'wrong-tenant' },
    };
    
    const response = createMockResponse(body);
    
    // Should fail because summary.org_id doesn't match expected
    await expect(async () => {
      await expectAllowedWithBodyCheck(response, '/api/test', 'TEST_ROLE', {
        expectedOrgId: 'correct-tenant',
      });
    }).rejects.toThrow(/TENANT MISMATCH/);
  });

  test('catches org_id mismatch in deeply nested non-allowlist structure', async () => {
    // This tests deeply nested objects where each level has org_id
    // The helper should recurse through all levels and catch the mismatch
    const body = {
      org_id: 'correct-tenant',
      summary: {
        org_id: 'correct-tenant',
        details: {
          org_id: 'wrong-tenant', // Mismatch at third level
          count: 10,
        },
      },
    };
    
    const response = createMockResponse(body);
    
    // Should fail because summary.details.org_id doesn't match
    await expect(async () => {
      await expectAllowedWithBodyCheck(response, '/api/test', 'TEST_ROLE', {
        expectedOrgId: 'correct-tenant',
      });
    }).rejects.toThrow(/TENANT MISMATCH/);
  });

  /**
   * POSITIVE-PATH TEST: Non-allowlist keys with matching org_id
   * 
   * This ensures the helper doesn't over-restrict valid responses that use
   * arbitrary keys (not in data/items/results allowlist) but have correct tenant IDs.
   * Guards against future changes that might reject valid tenant-scoped responses.
   */
  test('accepts matching org_id under arbitrary non-allowlist key', async () => {
    const body = {
      org_id: 'correct-tenant',
      summary: { org_id: 'correct-tenant', totalCount: 10 },
      customPayload: {
        org_id: 'correct-tenant',
        records: [{ org_id: 'correct-tenant', id: '1' }],
      },
    };
    
    const response = createMockResponse(body);
    
    // Should NOT throw - all org_id values match across non-allowlist keys
    await expectAllowedWithBodyCheck(response, '/api/test', 'TEST_ROLE', {
      expectedOrgId: 'correct-tenant',
    });
  });
});

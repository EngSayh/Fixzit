/**
 * @file Secure Test Credentials Utility
 * @description Provides secure credential retrieval for E2E tests.
 *              NEVER uses fallback defaults - requires explicit env configuration.
 *
 * Required Environment Variables (see env.example):
 *   TEST_FINANCE_OFFICER_EMAIL, TEST_FINANCE_OFFICER_PASSWORD
 *   TEST_HR_OFFICER_EMAIL, TEST_HR_OFFICER_PASSWORD
 *   TEST_SUPPORT_AGENT_EMAIL, TEST_SUPPORT_AGENT_PASSWORD
 *   TEST_OPERATIONS_MANAGER_EMAIL, TEST_OPERATIONS_MANAGER_PASSWORD
 *   TEST_TEAM_MEMBER_EMAIL, TEST_TEAM_MEMBER_PASSWORD
 *   TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD
 *   TEST_ORG_ID - Required for tenant-scoped validation (multi-tenancy checks)
 *
 * @security This module intentionally has NO fallback credentials.
 *           Tests will fail fast if env vars are missing.
 */

export interface TestCredentials {
  email: string;
  password: string;
  /** Optional employee number for employee-number login tests */
  employeeNumber?: string;
}

export type SubRoleKey =
  | 'FINANCE_OFFICER'
  | 'HR_OFFICER'
  | 'SUPPORT_AGENT'
  | 'OPERATIONS_MANAGER'
  | 'TEAM_MEMBER'
  | 'ADMIN';

/**
 * Get optional test org identifier used for tenant-scoping assertions.
 * Returns undefined if not configured, allowing tests to skip org_id checks gracefully.
 */
export function getTestOrgIdOptional(): string | undefined {
  return process.env.TEST_ORG_ID;
}

/**
 * Get required test credentials for a specific sub-role.
 * Throws immediately if environment variables are not configured.
 *
 * @param subRole - The sub-role key (e.g., 'FINANCE_OFFICER', 'HR_OFFICER')
 * @returns TestCredentials with email and password
 * @throws Error if required env vars are not set
 *
 * @example
 * const creds = getRequiredTestCredentials('FINANCE_OFFICER');
 * // Uses TEST_FINANCE_OFFICER_EMAIL and TEST_FINANCE_OFFICER_PASSWORD
 */
export function getRequiredTestCredentials(subRole: SubRoleKey): TestCredentials {
  const emailKey = `TEST_${subRole}_EMAIL`;
  const passwordKey = `TEST_${subRole}_PASSWORD`;
  const employeeKey = `TEST_${subRole}_EMPLOYEE`;

  const email = process.env[emailKey];
  const password = process.env[passwordKey];
  const employeeNumber = process.env[employeeKey]; // Optional except where enforced below

  const missing: string[] = [];
  if (!email) missing.push(emailKey);
  if (!password) missing.push(passwordKey);
  // Employee-number login test requires ADMIN employee number
  if (subRole === 'ADMIN' && !employeeNumber) missing.push(employeeKey);

  if (missing.length > 0) {
    throw new Error(
      `Missing required test credentials for ${subRole}:\n` +
        `  ${missing.join(', ')}\n` +
        `\n` +
        `E2E tests require explicit credentials in environment variables.\n` +
        `See env.example for the full list of TEST_* variables.\n` +
        `\n` +
        `To configure:\n` +
        `  1. Copy env.example to .env.local (if not done)\n` +
        `  2. Set ${emailKey}=<test-user-email>\n` +
        `  3. Set ${passwordKey}=<test-user-password>\n` +
        `  4. (Optional) Set ${employeeKey}=<employee-number> for employee login tests\n` +
        `\n` +
        `SECURITY: Never commit credentials. Use .env.local for local testing,\n` +
        `or CI secrets for automated pipelines.`
    );
  }

  return { 
    email, 
    password,
    ...(employeeNumber ? { employeeNumber } : {}),
  };
}

/**
 * Check if credentials are available for a specific sub-role.
 * Does not throw - returns boolean for conditional logic.
 *
 * For ADMIN, also checks TEST_ADMIN_EMPLOYEE since getRequiredTestCredentials('ADMIN')
 * requires it for employee-number login tests.
 *
 * @param subRole - The sub-role key
 * @returns true if all required credentials for the role are configured
 */
export function hasTestCredentials(subRole: SubRoleKey): boolean {
  const emailKey = `TEST_${subRole}_EMAIL`;
  const passwordKey = `TEST_${subRole}_PASSWORD`;

  const hasBasic = Boolean(process.env[emailKey] && process.env[passwordKey]);

  // ADMIN requires employee number for employee-number login test
  if (subRole === 'ADMIN') {
    const employeeKey = `TEST_${subRole}_EMPLOYEE`;
    return hasBasic && Boolean(process.env[employeeKey]);
  }

  return hasBasic;
}

/**
 * Get all configured sub-roles from environment.
 * Useful for dynamic test generation based on available credentials.
 *
 * @returns Array of SubRoleKey that have both email and password configured
 */
export function getConfiguredSubRoles(): SubRoleKey[] {
  const allSubRoles: SubRoleKey[] = [
    'FINANCE_OFFICER',
    'HR_OFFICER',
    'SUPPORT_AGENT',
    'OPERATIONS_MANAGER',
    'TEAM_MEMBER',
    'ADMIN',
  ];

  return allSubRoles.filter(hasTestCredentials);
}

/**
 * Validate that all required test credentials are configured.
 * Throws a comprehensive error listing all missing credentials.
 *
 * @param requiredSubRoles - Array of sub-roles that must have credentials
 * @throws Error if any required credentials are missing
 */
export function validateRequiredCredentials(requiredSubRoles: SubRoleKey[]): void {
  const missingCredentials: string[] = [];

  for (const subRole of requiredSubRoles) {
    const emailKey = `TEST_${subRole}_EMAIL`;
    const passwordKey = `TEST_${subRole}_PASSWORD`;

    if (!process.env[emailKey]) missingCredentials.push(emailKey);
    if (!process.env[passwordKey]) missingCredentials.push(passwordKey);
  }

  if (missingCredentials.length > 0) {
    throw new Error(
      `E2E Test Setup Error: Missing ${missingCredentials.length} required credentials:\n\n` +
        missingCredentials.map((key) => `  • ${key}`).join('\n') +
        `\n\n` +
        `Configure these in .env.local or CI secrets.\n` +
        `See env.example for documentation.`
    );
  }
}

/**
 * Get the test organization ID for tenant-scoped validation.
 * Required for multi-tenancy checks in E2E tests.
 *
 * @returns The TEST_ORG_ID environment variable value
 * @throws Error if TEST_ORG_ID is not configured
 *
 * @example
 * const orgId = getTestOrgId();
 * // Use in expectAllowedWithBodyCheck for tenant validation
 * body.forEach(item => expect(item.org_id).toBe(orgId));
 */
export function getTestOrgId(): string {
  const orgId = process.env.TEST_ORG_ID;

  if (!orgId) {
    throw new Error(
      `Missing required TEST_ORG_ID environment variable.\n\n` +
        `TEST_ORG_ID is required for multi-tenancy validation in E2E tests.\n` +
        `It should be set to the organization ID of your test tenant.\n\n` +
        `To configure:\n` +
        `  1. Set TEST_ORG_ID=<your-test-org-id> in .env.local\n` +
        `  2. Or add TEST_ORG_ID to CI secrets\n\n` +
        `SECURITY: This validates that API responses don't leak\n` +
        `data from other tenants (cross-tenant data isolation).`
    );
  }

  return orgId;
}

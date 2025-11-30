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
 *
 * @security This module intentionally has NO fallback credentials.
 *           Tests will fail fast if env vars are missing.
 */

export interface TestCredentials {
  email: string;
  password: string;
}

export type SubRoleKey =
  | 'FINANCE_OFFICER'
  | 'HR_OFFICER'
  | 'SUPPORT_AGENT'
  | 'OPERATIONS_MANAGER'
  | 'TEAM_MEMBER'
  | 'ADMIN';

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

  const email = process.env[emailKey];
  const password = process.env[passwordKey];

  if (!email || !password) {
    const missing: string[] = [];
    if (!email) missing.push(emailKey);
    if (!password) missing.push(passwordKey);

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
        `\n` +
        `SECURITY: Never commit credentials. Use .env.local for local testing,\n` +
        `or CI secrets for automated pipelines.`
    );
  }

  return { email, password };
}

/**
 * Check if credentials are available for a specific sub-role.
 * Does not throw - returns boolean for conditional logic.
 *
 * @param subRole - The sub-role key
 * @returns true if both email and password are configured
 */
export function hasTestCredentials(subRole: SubRoleKey): boolean {
  const emailKey = `TEST_${subRole}_EMAIL`;
  const passwordKey = `TEST_${subRole}_PASSWORD`;

  return Boolean(process.env[emailKey] && process.env[passwordKey]);
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

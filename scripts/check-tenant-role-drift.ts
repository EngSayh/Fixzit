#!/usr/bin/env tsx
/**
 * Guardrail: fail if demo/test seeds drift from tenancy or STRICT v4.1 roles.
 *
 * - Blocks hard-coded org IDs in seed/config files.
 * - Ensures demo role definitions use the canonical role set.
 *
 * Usage:
 *   pnpm tsx scripts/check-tenant-role-drift.ts
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const HARD_CODED_ORG = '68dc8955a1ba6ed80ff372dc';

// STRICT v4.1 canonical roles - synced with CANONICAL_ROLES from types/user.ts
// Includes all 22 canonical roles (14 base + sub-roles + property/external)
export const ALLOWED_ROLES = new Set([
  // Administrative Roles (4)
  'SUPER_ADMIN',
  'CORPORATE_ADMIN',
  'ADMIN',
  'MANAGER',
  // Facility Management Roles (3)
  'FM_MANAGER',
  'PROPERTY_MANAGER',
  'TECHNICIAN',
  // Business Function Roles (3)
  'FINANCE',
  'HR',
  'PROCUREMENT',
  // Team Member base role
  'TEAM_MEMBER',
  // Specialized Sub-Roles (4)
  'FINANCE_OFFICER',
  'HR_OFFICER',
  'SUPPORT_AGENT',
  'OPERATIONS_MANAGER',
  // Souq Marketplace Roles (2)
  'SOUQ_ADMIN',
  'MARKETPLACE_MODERATOR',
  // Property & External Roles (5)
  'OWNER',
  'TENANT',
  'VENDOR',
  'AUDITOR',
  'CORPORATE_OWNER',
  // Legacy roles allowed during migration
  'SUPPORT',
  'PROPERTY_OWNER', // Alias for OWNER in some contexts
]);

// Files to police
export const FILES = [
  'lib/config/demo-users.ts',
  'scripts/seed-demo-users.ts',
  'scripts/create-demo-users.ts',
  'scripts/seed-test-users.ts',
  'scripts/seed-e2e-test-users.ts',
];

type Finding = { file: string; message: string };

export async function findHardCodedOrg(file: string): Promise<Finding[]> {
  const contents = await fs.readFile(file, 'utf-8');
  return contents.includes(HARD_CODED_ORG)
    ? [{ file, message: `Hard-coded org id "${HARD_CODED_ORG}" found.` }]
    : [];
}

export async function findRoleDrift(file: string): Promise<Finding[]> {
  const contents = await fs.readFile(file, 'utf-8');
  const roleMatches = Array.from(
    contents.matchAll(/\brole\s*:\s*["'`]([^"'`]+)["'`]/g),
  ).map((m) => m[1]);
  const badRoles = roleMatches.filter((role) => !ALLOWED_ROLES.has(role));
  if (badRoles.length === 0) return [];
  const unique = Array.from(new Set(badRoles));
  return [
    {
      file,
      message: `Non-canonical roles detected: ${unique.join(
        ', ',
      )}. Allowed: ${Array.from(ALLOWED_ROLES).join(', ')}`,
    },
  ];
}

export async function runDriftCheck(): Promise<Finding[]> {
  const findings: Finding[] = [];
  for (const rel of FILES) {
    const file = path.resolve(process.cwd(), rel);
    try {
      const [orgIssues, roleIssues] = await Promise.all([
        findHardCodedOrg(file),
        findRoleDrift(file),
      ]);
      findings.push(...orgIssues, ...roleIssues);
    } catch (err) {
      findings.push({ file: rel, message: `Failed to scan file: ${err}` });
    }
  }

  return findings;
}

async function main() {
  try {
    const findings = await runDriftCheck();
    if (findings.length > 0) {
      console.error('❌ Tenant/role drift detected:');
      findings.forEach((f) => console.error(`- ${f.file}: ${f.message}`));
      process.exit(1);
    }

    console.log('✅ No hard-coded org IDs or role drift found in seed/config files.');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

const invokedDirectly = (() => {
  const argvPath = process.argv[1];
  if (!argvPath) return false;
  return pathToFileURL(argvPath).href === import.meta.url;
})();

if (invokedDirectly) {
  // eslint-disable-next-line no-console
  main();
}

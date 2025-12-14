#!/usr/bin/env tsx
/**
 * CI Environment Guard Check
 * 
 * Validates environment configuration against production security rules.
 * 
 * Usage:
 *   pnpm env:check
 *   tsx scripts/ci/env-guard-check.ts
 * 
 * Exit Codes:
 *   0 - All checks passed
 *   1 - One or more checks failed
 */

import { validateProductionEnvCli } from '../../lib/config/env-guards';

// Load env for local testing (Vercel deployments have env already)
async function loadEnv() {
  try {
    const { loadEnvConfig } = await import('@next/env');
    loadEnvConfig(process.cwd());
  } catch (error) {
    console.warn('⚠️  Could not load @next/env (this is OK in CI/Vercel)');
  }
}

async function main() {
  await loadEnv();
  
  console.log('🔍 Running environment validation checks...\n');
  console.log(`Environment: ${process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown'}\n`);

  const exitCode = validateProductionEnvCli();
  process.exit(exitCode);
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

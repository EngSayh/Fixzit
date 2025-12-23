#!/usr/bin/env node
/**
 * RBAC Parity Check Script
 * 
 * Validates that ROLE_MODULES and computeAllowedModules produce consistent
 * results across all three RBAC sources:
 * - domain/fm/fm.behavior.ts (server source of truth)
 * - domain/fm/fm.types.ts (client-safe)
 * - domain/fm/fm-lite.ts (client façade)
 * 
 * Run: node scripts/rbac/check-parity.mjs
 * 
 * @see tests/domain/fm.can-parity.test.ts for comprehensive parity tests
 */

import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '../..');

console.log('🔍 RBAC Parity Check\n');
console.log('=' .repeat(60));

// Run the parity tests as the source of truth
console.log('\n📋 Running parity tests...\n');

try {
  const result = execSync(
    'pnpm vitest run tests/domain/fm.can-parity.test.ts --reporter=dot 2>&1',
    { cwd: ROOT, encoding: 'utf-8', timeout: 60000 }
  );
  
  // Check for pass/fail
  if (result.includes('Tests') && !result.includes('failed')) {
    console.log('✅ All parity tests passed\n');
    console.log(result.split('\n').slice(-10).join('\n'));
    process.exit(0);
  } else {
    console.error('❌ Parity tests failed:\n');
    console.error(result);
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Failed to run parity tests:\n');
  console.error(error.stdout || error.message);
  process.exit(1);
}

#!/usr/bin/env node

/**
 * CI Guard: Inline Admin Role Check Detector v2
 * 
 * Warns about new inline SUPER_ADMIN role checks in /api/admin routes.
 * Encourages migration to canonical guards (lib/api/admin-guard.ts).
 * 
 * Features:
 * - Scans only route.ts files in app/api/admin
 * - Excludes test files and documentation
 * - Supports allow comments: // guard-admin-checks:allow(FIXZIT-123)
 * 
 * Usage: node scripts/guard-admin-checks.js [--strict]
 *   --strict: Fail if any new violations above baseline
 * 
 * @module scripts/guard-admin-checks
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// CLI flags
const isStrict = process.argv.includes('--strict');

// Patterns that indicate inline role checking (should use guard instead)
const INLINE_PATTERNS = [
  'role !== "SUPER_ADMIN"',
  'role === "SUPER_ADMIN"',
  'role !== \'SUPER_ADMIN\'',
  'role === \'SUPER_ADMIN\'',
  '.role === "ADMIN"',
  '.role !== "ADMIN"',
];

// Allow comment pattern (with ticket ID)
const ALLOW_PATTERN = /guard-admin-checks:allow\((FIXZIT-\d+|FIX-\d+|#\d+)\)/i;

// Files using canonical guards (exempt from warnings)
const CANONICAL_IMPORTS = [
  'requireAdmin',
  'requireSuperadmin', 
  'requireSuperAdmin',
  'getSuperadminSession',
  'lib/api/admin-guard',
  'lib/authz',
];

// Directories to scan - only route.ts files
const SCAN_DIRS = [
  'app/api/admin',
];

// Exclude patterns
const EXCLUDE_PATTERNS = [
  '.test.ts',
  '.spec.ts',
  '__tests__',
  'tests/',
  'docs/',
];

// Count existing violations (baseline)
const BASELINE_COUNT = 35; // Set based on current state - to be reduced during migration

function main() {
  console.log('🔐 Guard v2: Scanning for inline admin role checks...\n');
  
  const violations = [];
  const warnings = [];
  const allowed = [];
  
  for (const dir of SCAN_DIRS) {
    const dirPath = path.join(process.cwd(), dir);
    
    if (!fs.existsSync(dirPath)) continue;
    
    for (const pattern of INLINE_PATTERNS) {
      try {
        // Only scan route.ts files
        const escapedPattern = pattern.replace(/"/g, '\\"');
        const cmd = `grep -rn "${escapedPattern}" "${dirPath}" --include="route.ts" 2>/dev/null || true`;
        const result = execSync(cmd, { encoding: 'utf8' }).trim();
        
        if (result) {
          const lines = result.split('\n');
          for (const line of lines) {
            // Skip excluded patterns
            if (EXCLUDE_PATTERNS.some(excl => line.includes(excl))) {
              continue;
            }
            
            // Check for allow comment on same line
            if (ALLOW_PATTERN.test(line)) {
              allowed.push({ line, type: 'ticketed-allow' });
              continue;
            }
            
            // Check if file uses canonical guards
            const filePath = line.split(':')[0];
            if (filePath && usesCanonicalGuard(filePath)) {
              // File already uses canonical guard, this might be legacy or conditional
              warnings.push({ file: filePath, line, type: 'legacy' });
            } else {
              violations.push({ file: filePath, line, pattern });
            }
          }
        }
      } catch {
        // Scan failed
      }
    }
  }
  
  // Report allowed items (for transparency)
  if (allowed.length > 0) {
    console.log(`ℹ️  Allowed with ticket: ${allowed.length} inline check(s)\n`);
  }
  
  // Report findings
  const newViolations = Math.max(0, violations.length - BASELINE_COUNT);
  
  if (newViolations > 0) {
    console.log('⚠️  NEW inline admin checks detected (above baseline):\n');
    for (const v of violations.slice(BASELINE_COUNT)) {
      console.log(`   ${v.line}`);
    }
    console.log('\n   ℹ️  Use requireAdmin()/requireSuperadmin() from lib/api/admin-guard.ts');
    console.log(`   Or add allow comment: // guard-admin-checks:allow(FIXZIT-XXX)`);
    console.log(`   Baseline: ${BASELINE_COUNT}, Current: ${violations.length}\n`);
    
    if (isStrict) {
      console.log('❌ Strict mode: failing due to new violations.\n');
      process.exit(1);
    }
  }
  
  if (violations.length > 0) {
    console.log(`📊 Inline admin check stats:`);
    console.log(`   Total: ${violations.length} (baseline: ${BASELINE_COUNT})`);
    console.log(`   New: ${newViolations}`);
    console.log(`   Allowed: ${allowed.length}\n`);
  } else {
    console.log('✅ No inline admin checks found.\n');
  }
  
  // For now, only warn, don't fail
  // TODO: Change to exit(1) once baseline is cleaned up
  process.exit(0);
}

function usesCanonicalGuard(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return CANONICAL_IMPORTS.some(guard => content.includes(guard));
  } catch {
    return false;
  }
}

main();

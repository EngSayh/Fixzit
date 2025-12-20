#!/usr/bin/env node

/**
 * CI Guard: Inline Admin Role Check Detector
 * 
 * Warns about new inline SUPER_ADMIN role checks in /api/admin routes.
 * Encourages migration to canonical guards (lib/api/admin-guard.ts).
 * 
 * Usage: node scripts/guard-admin-checks.js
 * 
 * @module scripts/guard-admin-checks
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Patterns that indicate inline role checking (should use guard instead)
const INLINE_PATTERNS = [
  'role !== "SUPER_ADMIN"',
  'role === "SUPER_ADMIN"',
  'role !== \'SUPER_ADMIN\'',
  'role === \'SUPER_ADMIN\'',
  '.role === "ADMIN"',
  '.role !== "ADMIN"',
];

// Files using canonical guards (exempt from warnings)
const CANONICAL_IMPORTS = [
  'requireAdmin',
  'requireSuperadmin', 
  'requireSuperAdmin',
  'getSuperadminSession',
  'lib/api/admin-guard',
  'lib/authz',
];

// Directories to scan
const SCAN_DIRS = [
  'app/api/admin',
];

// Count existing violations (baseline)
const BASELINE_COUNT = 35; // Set based on current state - to be reduced during migration

function main() {
  console.log('🔐 Guard: Scanning for inline admin role checks...\n');
  
  const violations = [];
  const warnings = [];
  
  for (const dir of SCAN_DIRS) {
    const dirPath = path.join(process.cwd(), dir);
    
    if (!fs.existsSync(dirPath)) continue;
    
    for (const pattern of INLINE_PATTERNS) {
      try {
        const escapedPattern = pattern.replace(/"/g, '\\"');
        const cmd = `grep -rn "${escapedPattern}" "${dirPath}" --include="*.ts" 2>/dev/null || true`;
        const result = execSync(cmd, { encoding: 'utf8' }).trim();
        
        if (result) {
          const lines = result.split('\n');
          for (const line of lines) {
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
  
  // Report findings
  if (violations.length > BASELINE_COUNT) {
    console.log('⚠️  NEW inline admin checks detected (above baseline):\n');
    for (const v of violations.slice(BASELINE_COUNT)) {
      console.log(`   ${v.line}`);
    }
    console.log('\n   ℹ️  Use requireAdmin()/requireSuperadmin() from lib/api/admin-guard.ts');
    console.log(`   Baseline: ${BASELINE_COUNT}, Current: ${violations.length}\n`);
  }
  
  if (violations.length > 0) {
    console.log(`📊 Inline admin check stats:`);
    console.log(`   Total: ${violations.length} (baseline: ${BASELINE_COUNT})`);
    console.log(`   New: ${Math.max(0, violations.length - BASELINE_COUNT)}\n`);
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

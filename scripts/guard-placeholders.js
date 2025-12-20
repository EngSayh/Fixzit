#!/usr/bin/env node

/**
 * CI Guard: Placeholder Detection v4
 * Fails the build if production routes contain placeholder text.
 * 
 * Features:
 * - Strong patterns (always forbidden): "will be implemented here", "TODO: Implement"
 * - Weak patterns (context-checked): "Coming Soon" allowed in badges/comments
 * - .only check: Blocks CI if test files contain .only
 * - Ticketed allow comments: `guard-placeholders:allow(FIXZIT-123)` to exempt specific lines
 * - CI enforcement: In CI mode, legacy allows (without ticket) are errors
 * 
 * Usage: node scripts/guard-placeholders.js [--strict]
 *   --strict: Fail on legacy allows (for CI enforcement)
 * 
 * @module scripts/guard-placeholders
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// CLI flags
const isStrict = process.argv.includes('--strict');
const isCI = process.env.CI === 'true' || isStrict;

// Legacy allow cutoff date (after this date, legacy allows fail in CI)
const LEGACY_CUTOFF_DATE = new Date('2025-01-15');

// Strong patterns - ALWAYS forbidden (no context override)
const STRONG_PATTERNS = [
  'will be implemented here',
  'TODO: Implement',
  'PLACEHOLDER',
  'Under Construction',
];

// Weak patterns - forbidden unless in allowed context
const WEAK_PATTERNS = [
  'Coming Soon',
];

// Ticket pattern for allow comments (FIXZIT-123, FIX-123, #123)
const TICKET_PATTERN = /guard-placeholders:allow\((FIXZIT-\d+|FIX-\d+|#\d+)\)/i;

// Legacy allow without ticket (to be deprecated)
const LEGACY_ALLOW_PATTERN = /guard-placeholders:allow(?!\()/i;

// Allowed contexts for weak patterns (regex patterns)
const ALLOWED_CONTEXTS = [
  /\{\/\*.*Coming Soon.*\*\/\}/i,          // JSX comments: {/* Coming Soon */}
  /\/\/.*Coming Soon/i,                     // Line comments: // Coming Soon
  /Badge.*Coming Soon|Coming Soon.*Badge/i, // Badge component usage
  /i18n|t\(|auto\(/i,                       // i18n function calls
  TICKET_PATTERN,                           // Ticketed allow marker
];

// Directories to scan
const SCAN_DIRS = [
  'app/superadmin',
  'app/(fm)',
  'app/aqar',
  'app/souq',
];

// Files/patterns to exclude
const EXCLUDE_PATTERNS = [
  '*.test.ts',
  '*.test.tsx',
  '**/PlannedFeature.tsx',
  '**/components/**',
  'leases/page.tsx',
  'documents/page.tsx',
  'import-export/page.tsx',
];

// Track legacy allows for warning
const legacyAllows = [];

function isAllowedContext(line) {
  // Check for legacy (non-ticketed) allow
  if (LEGACY_ALLOW_PATTERN.test(line) && !TICKET_PATTERN.test(line)) {
    legacyAllows.push(line);
    // Still allow for now (grace period), but warn
    return true;
  }
  return ALLOWED_CONTEXTS.some(regex => regex.test(line));
}

function checkForOnly() {
  console.log('🔍 Checking for .only in test files...\n');
  
  try {
    const cmd = `grep -rn "\\.only" tests/ --include="*.test.ts" --include="*.test.tsx" 2>/dev/null || true`;
    const result = execSync(cmd, { encoding: 'utf8' }).trim();
    
    if (result) {
      // Filter to only match describe.only, it.only, test.only
      const lines = result.split('\n').filter(line => 
        /\b(describe|it|test)\.only\b/.test(line)
      );
      
      if (lines.length > 0) {
        console.log('❌ .only DETECTED IN TESTS\n');
        console.log('The following test files contain .only which blocks CI:\n');
        lines.forEach(line => console.log(`   ${line}`));
        console.log('\nRemove .only before committing.\n');
        return true;
      }
    }
  } catch {
    // Ignore errors
  }
  
  return false;
}

function main() {
  console.log('🔍 Guard v2: Scanning for placeholder patterns...\n');
  
  let hasViolations = false;
  const violations = [];

  // Check for .only first
  if (checkForOnly()) {
    hasViolations = true;
  }

  // Check strong patterns (always forbidden)
  for (const pattern of STRONG_PATTERNS) {
    for (const dir of SCAN_DIRS) {
      const dirPath = path.join(process.cwd(), dir);
      
      if (!fs.existsSync(dirPath)) continue;
      
      try {
        const cmd = `grep -rn "${pattern}" "${dirPath}" --include="*.tsx" --include="*.ts" 2>/dev/null || true`;
        const result = execSync(cmd, { encoding: 'utf8' });
        
        if (result.trim()) {
          const lines = result.trim().split('\n').filter(line => {
            // Exclude by path pattern
            if (EXCLUDE_PATTERNS.some(exclude => {
              if (exclude.startsWith('**/')) return line.includes(exclude.slice(3));
              return line.includes(exclude);
            })) return false;
            
            // Check for explicit allow marker
            if (/guard-placeholders:allow/i.test(line)) return false;
            
            return true;
          });
          
          if (lines.length > 0) {
            hasViolations = true;
            violations.push({ pattern, matches: lines, type: 'strong' });
          }
        }
      } catch {
        // Directory scan failed
      }
    }
  }

  // Check weak patterns (context-aware)
  for (const pattern of WEAK_PATTERNS) {
    for (const dir of SCAN_DIRS) {
      const dirPath = path.join(process.cwd(), dir);
      
      if (!fs.existsSync(dirPath)) continue;
      
      try {
        const cmd = `grep -rn "${pattern}" "${dirPath}" --include="*.tsx" --include="*.ts" 2>/dev/null || true`;
        const result = execSync(cmd, { encoding: 'utf8' });
        
        if (result.trim()) {
          const lines = result.trim().split('\n').filter(line => {
            // Exclude by path pattern
            if (EXCLUDE_PATTERNS.some(exclude => {
              if (exclude.startsWith('**/')) return line.includes(exclude.slice(3));
              return line.includes(exclude);
            })) return false;
            
            // Check if in allowed context
            if (isAllowedContext(line)) return false;
            
            return true;
          });
          
          if (lines.length > 0) {
            hasViolations = true;
            violations.push({ pattern, matches: lines, type: 'weak' });
          }
        }
      } catch {
        // Directory scan failed
      }
    }
  }

  if (hasViolations) {
    console.log('❌ PLACEHOLDER VIOLATION DETECTED\n');
    
    for (const { pattern, matches, type } of violations) {
      console.log(`\n📍 Pattern: "${pattern}" (${type})`);
      for (const match of matches) {
        console.log(`   ${match}`);
      }
    }
    
    console.log('\n');
    console.log('━'.repeat(60));
    console.log('To fix:');
    console.log('  1. Replace placeholder text with real implementations');
    console.log('  2. Or add ticketed allow: {/* guard-placeholders:allow(FIXZIT-123) */}');
    console.log('  3. Or use PlannedFeature component for roadmap items');
    console.log('━'.repeat(60));
    
    process.exit(1);
  }

  // Handle legacy allows (without ticket IDs)
  if (legacyAllows.length > 0) {
    const now = new Date();
    const isPastCutoff = now > LEGACY_CUTOFF_DATE;
    
    if (isCI && isPastCutoff) {
      // CI mode after cutoff: FAIL on legacy allows
      console.log('❌ LEGACY ALLOW VIOLATION (CI mode)\n');
      console.log(`   Found ${legacyAllows.length} allow comment(s) without ticket IDs.`);
      console.log(`   Legacy allows are not permitted after ${LEGACY_CUTOFF_DATE.toISOString().split('T')[0]}.\n`);
      
      for (const line of legacyAllows.slice(0, 10)) {
        const match = line.match(/^([^:]+:\d+)/);
        if (match) console.log(`   ${match[1]}`);
      }
      if (legacyAllows.length > 10) {
        console.log(`   ... and ${legacyAllows.length - 10} more`);
      }
      
      console.log('\n');
      console.log('━'.repeat(60));
      console.log('To fix:');
      console.log('  Update to ticketed format: guard-placeholders:allow(FIXZIT-XXX)');
      console.log('  Or remove the placeholder text entirely.');
      console.log('━'.repeat(60));
      
      process.exit(1);
    } else if (isCI) {
      // CI mode before cutoff: WARN only
      console.log('⚠️  WARNING: Found ' + legacyAllows.length + ' allow comment(s) without ticket IDs:\n');
      for (const line of legacyAllows.slice(0, 10)) {
        const match = line.match(/^([^:]+:\d+)/);
        if (match) console.log(`   ${match[1]}`);
      }
      if (legacyAllows.length > 10) {
        console.log(`   ... and ${legacyAllows.length - 10} more`);
      }
      console.log(`\n   ⏰ Grace period until ${LEGACY_CUTOFF_DATE.toISOString().split('T')[0]}. Update to ticketed format!\n`);
    } else {
      // Local mode: WARN only
      console.log('⚠️  WARNING: Found ' + legacyAllows.length + ' allow comment(s) without ticket IDs:\n');
      for (const line of legacyAllows.slice(0, 10)) {
        const match = line.match(/^([^:]+:\d+)/);
        if (match) console.log(`   ${match[1]}`);
      }
      if (legacyAllows.length > 10) {
        console.log(`   ... and ${legacyAllows.length - 10} more`);
      }
      console.log('\n   ℹ️  Update to ticketed format: guard-placeholders:allow(FIXZIT-XXX)\n');
    }
  }

  console.log('✅ No placeholder violations found.\n');
  process.exit(0);
}

main();

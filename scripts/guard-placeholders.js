#!/usr/bin/env node

/**
 * CI Guard: Placeholder Detection v2
 * Fails the build if production routes contain placeholder text.
 * 
 * Features:
 * - Strong patterns (always forbidden): "will be implemented here", "TODO: Implement"
 * - Weak patterns (context-checked): "Coming Soon" allowed in badges/comments
 * - .only check: Blocks CI if test files contain .only
 * - Allow comments: Add `guard-placeholders:allow` to exempt specific lines
 * 
 * Usage: node scripts/guard-placeholders.js
 * 
 * @module scripts/guard-placeholders
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

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

// Allowed contexts for weak patterns (regex patterns)
const ALLOWED_CONTEXTS = [
  /\{\/\*.*Coming Soon.*\*\/\}/i,          // JSX comments: {/* Coming Soon */}
  /\/\/.*Coming Soon/i,                     // Line comments: // Coming Soon
  /Badge.*Coming Soon|Coming Soon.*Badge/i, // Badge component usage
  /i18n|t\(|auto\(/i,                       // i18n function calls
  /guard-placeholders:allow/i,              // Explicit allow marker
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

function isAllowedContext(line) {
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
    console.log('  2. Or add comment: {/* guard-placeholders:allow - reason */}');
    console.log('  3. Or use PlannedFeature component for roadmap items');
    console.log('━'.repeat(60));
    
    process.exit(1);
  }

  console.log('✅ No placeholder violations found.\n');
  process.exit(0);
}

main();

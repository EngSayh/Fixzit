#!/usr/bin/env node

/**
 * CI Guard: Placeholder Detection
 * Fails the build if production routes contain placeholder text like "Coming Soon"
 * 
 * This prevents unfinished features from shipping to production.
 * 
 * Usage: node scripts/guard-placeholders.js
 * Add to package.json scripts: "guard:placeholders": "node scripts/guard-placeholders.js"
 * 
 * @module scripts/guard-placeholders
 */

const { execSync } = require('child_process');
const path = require('path');

// Patterns that indicate placeholder/stub pages
const FORBIDDEN_PATTERNS = [
  'Coming Soon',
  'will be implemented here',
  'Under Construction',
  'TODO: Implement',
  'PLACEHOLDER',
];

// Directories to scan
const SCAN_DIRS = [
  'app/superadmin',
  'app/fm',
  'app/aqar',
  'app/souq',
];

// Files/patterns to exclude
const EXCLUDE_PATTERNS = [
  '*.test.ts',
  '*.test.tsx',
  '**/PlannedFeature.tsx', // This component is allowed to use these words
  '**/components/**', // Components can define these for reuse
  // Legitimate "Coming Soon" badges for enhanced features (page has real content)
  'leases/page.tsx', // Has lease listing, badge is for advanced features
  'documents/page.tsx', // Has document listing, badge is for advanced features
  'import-export/page.tsx', // Has export tab working, import tab is planned
];

function main() {
  console.log('🔍 Scanning for placeholder patterns in production routes...\n');
  
  let hasViolations = false;
  const violations = [];

  for (const pattern of FORBIDDEN_PATTERNS) {
    for (const dir of SCAN_DIRS) {
      const dirPath = path.join(process.cwd(), dir);
      
      try {
        // Use grep to find matches
        const cmd = `grep -rn "${pattern}" "${dirPath}" --include="*.tsx" --include="*.ts" 2>/dev/null || true`;
        const result = execSync(cmd, { encoding: 'utf8' });
        
        if (result.trim()) {
          // Filter out excluded patterns
          const lines = result.trim().split('\n').filter(line => {
            return !EXCLUDE_PATTERNS.some(exclude => {
              if (exclude.startsWith('**/')) {
                return line.includes(exclude.slice(3));
              }
              return line.includes(exclude);
            });
          });
          
          if (lines.length > 0) {
            hasViolations = true;
            violations.push({
              pattern,
              matches: lines,
            });
          }
        }
      } catch {
        // Directory doesn't exist, skip
      }
    }
  }

  if (hasViolations) {
    console.log('❌ PLACEHOLDER VIOLATION DETECTED\n');
    console.log('The following placeholder patterns were found in production routes:\n');
    
    for (const { pattern, matches } of violations) {
      console.log(`\n📍 Pattern: "${pattern}"`);
      for (const match of matches) {
        console.log(`   ${match}`);
      }
    }
    
    console.log('\n');
    console.log('━'.repeat(60));
    console.log('To fix: Replace placeholder pages with real implementations');
    console.log('or use the PlannedFeature component for roadmap items.');
    console.log('━'.repeat(60));
    
    process.exit(1);
  }

  console.log('✅ No placeholder violations found in production routes.\n');
  process.exit(0);
}

main();

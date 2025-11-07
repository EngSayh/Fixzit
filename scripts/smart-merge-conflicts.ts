#!/usr/bin/env tsx
/**
 * Smart Conflict Resolution for PR #84
 * 
 * This script intelligently merges conflicts by:
 * 1. Keeping all PR #84 enhancements (rate limiting, security, OpenAPI)
 * 2. Preserving any new business logic from main
 * 3. Combining both properly
 */

import * as fs from 'fs';

interface ConflictSection {
  ours: string[];      // PR #84 version (HEAD)
  theirs: string[];    // main branch version
  ancestor?: string[]; // Base version (if available)
}

interface FileConflicts {
  filePath: string;
  conflicts: ConflictSection[];
  beforeFirst: string[];
  afterLast: string[];
}

// Patterns that indicate PR #84 enhancements
const PR84_PATTERNS = {
  imports: [
    /from ['"]@\/server\/security\/rateLimit['"]/,
    /from ['"]@\/server\/security\/headers['"]/,
    /from ['"]@\/server\/utils\/errorResponses['"]/,
  ],
  code: [
    /rateLimit\(/,
    /createSecureResponse\(/,
    /rateLimitError\(/,
    /zodValidationError\(/,
    /handleApiError\(/,
  ],
  comments: [
    /@openapi/,
    /@summary/,
    /@description/,
  ],
};

function parseConflicts(content: string): FileConflicts | null {
  const lines = content.split('\n');
  const conflicts: ConflictSection[] = [];
  const beforeFirst: string[] = [];
  let afterLast: string[] = [];
  
  let inConflict = false;
  let inOurs = false;
  let inTheirs = false;
  let currentOurs: string[] = [];
  let currentTheirs: string[] = [];
  let foundFirstConflict = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith('<<<<<<< HEAD') || line.startsWith('<<<<<<< ours')) {
      foundFirstConflict = true;
      inConflict = true;
      inOurs = true;
      currentOurs = [];
      currentTheirs = [];
    } else if (line.startsWith('=======') && inConflict) {
      inOurs = false;
      inTheirs = true;
    } else if (line.startsWith('>>>>>>>') && inConflict) {
      inConflict = false;
      inTheirs = false;
      conflicts.push({
        ours: currentOurs,
        theirs: currentTheirs,
      });
    } else if (inOurs) {
      currentOurs.push(line);
    } else if (inTheirs) {
      currentTheirs.push(line);
    } else if (!foundFirstConflict) {
      beforeFirst.push(line);
    } else if (foundFirstConflict && !inConflict) {
      afterLast.push(line);
    }
  }
  
  if (conflicts.length === 0) {
    return null; // No conflicts
  }
  
  return {
    filePath: '',
    conflicts,
    beforeFirst,
    afterLast,
  };
}

function hasPR84Enhancement(lines: string[]): boolean {
  const content = lines.join('\n');
  
  // Check for PR #84 import patterns
  for (const pattern of PR84_PATTERNS.imports) {
    if (pattern.test(content)) return true;
  }
  
  // Check for PR #84 code patterns
  for (const pattern of PR84_PATTERNS.code) {
    if (pattern.test(content)) return true;
  }
  
  // Check for OpenAPI comments
  for (const pattern of PR84_PATTERNS.comments) {
    if (pattern.test(content)) return true;
  }
  
  return false;
}

function mergeConflictIntelligently(conflict: ConflictSection): string[] {
  const oursHasPR84 = hasPR84Enhancement(conflict.ours);
  const theirsHasPR84 = hasPR84Enhancement(conflict.theirs);
  
  // Case 1: Only our side (PR #84) has enhancements
  if (oursHasPR84 && !theirsHasPR84) {
    console.log('  → Keeping PR #84 enhancements (ours)');
    return conflict.ours;
  }
  
  // Case 2: Both sides have enhancements - need to merge
  if (oursHasPR84 && theirsHasPR84) {
    console.log('  → Merging both sides (complex)');
    // For now, keep ours but flag for manual review
    return [
      '// TODO: Review this merge - both sides had changes',
      ...conflict.ours,
    ];
  }
  
  // Case 3: Neither side has PR #84 patterns - this is business logic
  // Keep main's version (theirs) as it's likely newer
  if (!oursHasPR84 && !theirsHasPR84) {
    console.log('  → Keeping main\'s business logic (theirs)');
    return conflict.theirs;
  }
  
  // Case 4: Only their side has enhancements (unlikely but possible)
  console.log('  → Keeping theirs (has enhancements)');
  return conflict.theirs;
}

function resolveFile(filePath: string): boolean {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = parseConflicts(content);
  
  if (!parsed) {
    console.log(`✓ No conflicts: ${filePath}`);
    return true;
  }
  
  console.log(`\n🔧 Resolving: ${filePath}`);
  console.log(`   Found ${parsed.conflicts.length} conflict(s)`);
  
  const resolved: string[] = [...parsed.beforeFirst];
  
  for (let i = 0; i < parsed.conflicts.length; i++) {
    console.log(`   Conflict ${i + 1}/${parsed.conflicts.length}:`);
    const mergedLines = mergeConflictIntelligently(parsed.conflicts[i]);
    resolved.push(...mergedLines);
  }
  
  resolved.push(...parsed.afterLast);
  
  // Write back
  fs.writeFileSync(filePath, resolved.join('\n'), 'utf-8');
  console.log(`✅ Resolved: ${filePath}`);
  
  return true;
}

// Main execution
const conflictingFiles = [
  'app/api/aqar/map/route.ts',
  'app/api/aqar/properties/route.ts',
  'app/api/assistant/query/route.ts',
  'app/api/ats/convert-to-employee/route.ts',
  'app/api/auth/signup/route.ts',
  'app/api/billing/charge-recurring/route.ts',
  'app/api/contracts/route.ts',
  'app/api/feeds/indeed/route.ts',
  'app/api/feeds/linkedin/route.ts',
  'app/api/files/resumes/[file]/route.ts',
  'app/api/files/resumes/presign/route.ts',
  'app/api/finance/invoices/[id]/route.ts',
  'app/api/finance/invoices/route.ts',
  'app/api/kb/ingest/route.ts',
  'app/api/marketplace/products/route.ts',
  'app/api/payments/paytabs/callback/route.ts',
  'app/api/projects/route.ts',
  'app/api/qa/alert/route.ts',
  'app/api/qa/log/route.ts',
  'app/api/work-orders/export/route.ts',
  'app/api/work-orders/import/route.ts',
  'components/topbar/AppSwitcher.tsx',
  'server/copilot/retrieval.ts',
];

console.log('==========================================');
console.log('Smart Conflict Resolution for PR #84');
console.log('==========================================\n');

let resolved = 0;
let failed = 0;
let needsReview = 0;

for (const file of conflictingFiles) {
  try {
    const success = resolveFile(file);
    if (success) {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('TODO: Review this merge')) {
        needsReview++;
      } else {
        resolved++;
      }
    } else {
      failed++;
    }
  } catch (error: any) {
    console.log(`❌ Error resolving ${file}: ${error.message}`);
    failed++;
  }
}

console.log('\n==========================================');
console.log('Summary');
console.log('==========================================');
console.log(`✅ Auto-resolved: ${resolved}`);
console.log(`⚠️  Needs review: ${needsReview}`);
console.log(`❌ Failed: ${failed}`);
console.log('');

if (needsReview > 0) {
  console.log('Files with "TODO: Review this merge" comments need manual review.');
  console.log('Search for this comment in your editor.');
}

if (resolved > 0 || needsReview > 0) {
  console.log('\nNext steps:');
  console.log('1. Review changes: git diff');
  console.log('2. Stage changes: git add .');
  console.log('3. Commit: git commit -m "chore: resolve merge conflicts"');
  console.log('4. Push: git push origin fix/consolidation-guardrails');
}

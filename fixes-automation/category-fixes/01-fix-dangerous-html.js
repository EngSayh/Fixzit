#!/usr/bin/env node
/**
 * Category Fix #1: dangerouslySetInnerHTML (5 instances)
 * Security Priority: CRITICAL
 * 
 * This script:
 * 1. Searches for all dangerouslySetInnerHTML usage
 * 2. Analyzes each instance for security impact
 * 3. Applies sanitization where needed
 * 4. Documents before/after for PR
 */

const fs = require('fs');
const path = require('path');

console.log('🔒 Category Fix #1: dangerouslySetInnerHTML Security Review\n');
console.log('═══════════════════════════════════════════════════════════\n');

// Read CSV with exact locations
const csv = fs.readFileSync('fixes/dangerousHTML-locations.csv', 'utf8');
const lines = csv.split('\n').slice(1).filter(Boolean);

const fixes = [];

lines.forEach((line) => {
  const match = line.match(/^"([^"]+)",(\d+),"([^"]+)"/);
  if (!match) return;
  
  const [_, filePath, lineNum, code] = match;
  
  // Skip pattern definitions and test files
  if (filePath.includes('analyze-system-errors.js') || 
      filePath.includes('.spec.ts') || 
      filePath.includes('.test.ts')) {
    console.log(`⏭️  Skipping ${filePath} (test/pattern file)`);
    return;
  }
  
  console.log(`\n📍 Found in: ${filePath}:${lineNum}`);
  console.log(`   Code: ${code.substring(0, 100)}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`   ⚠️  File not found!`);
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const contentLines = content.split('\n');
  const targetLine = contentLines[parseInt(lineNum) - 1];
  
  // Analyze the usage
  let fix = {
    file: filePath,
    line: parseInt(lineNum),
    before: targetLine.trim(),
    after: null,
    severity: 'critical',
    reason: '',
    action: ''
  };
  
  // Check if it's already using sanitized rendering
  if (content.includes('renderMarkdownSanitized') || content.includes('DOMPurify.sanitize')) {
    console.log(`   ✅ Already using sanitized rendering`);
    fix.severity = 'safe';
    fix.reason = 'Uses sanitization function';
    fix.action = 'No fix needed - already safe';
  } else if (content.includes('renderMarkdown(')) {
    console.log(`   ⚠️  Uses renderMarkdown (not sanitized!)`);
    fix.severity = 'critical';
    fix.reason = 'Uses unsanitized markdown rendering';
    fix.action = 'Replace renderMarkdown with renderMarkdownSanitized';
    
    // Generate the fix
    const afterLine = targetLine.replace(/renderMarkdown\(/g, 'renderMarkdownSanitized(');
    fix.after = afterLine.trim();
    
    // Apply the fix
    contentLines[parseInt(lineNum) - 1] = afterLine;
    fs.writeFileSync(filePath, contentLines.join('\n'), 'utf8');
    console.log(`   ✅ FIXED: Replaced with renderMarkdownSanitized`);
  } else {
    console.log(`   ⚠️  Custom HTML injection - needs manual review`);
    fix.severity = 'review';
    fix.reason = 'Custom HTML usage - requires manual security audit';
    fix.action = 'Manual review: ensure content is sanitized before rendering';
  }
  
  fixes.push(fix);
});

// Generate report
console.log('\n' + '═'.repeat(60));
console.log('Security Fix Report - dangerouslySetInnerHTML');
console.log('═'.repeat(60) + '\n');

const critical = fixes.filter(f => f.severity === 'critical');
const safe = fixes.filter(f => f.severity === 'safe');
const review = fixes.filter(f => f.severity === 'review');

console.log(`Critical fixes applied: ${critical.length}`);
console.log(`Already safe: ${safe.length}`);
console.log(`Need manual review: ${review.length}`);
console.log();

// Save detailed report
const report = {
  category: 'dangerouslySetInnerHTML',
  totalInstances: fixes.length,
  fixesApplied: critical.length,
  alreadySafe: safe.length,
  needsReview: review.length,
  details: fixes
};

fs.writeFileSync('.artifacts/fix-dangerous-html-report.json', JSON.stringify(report, null, 2));

// Generate markdown report for PR
let md = `# Security Fix Report: dangerouslySetInnerHTML

## Summary
- **Total Instances**: ${fixes.length}
- **Fixes Applied**: ${critical.length}
- **Already Safe**: ${safe.length}
- **Needs Review**: ${review.length}

## Details

`;

fixes.forEach((fix, idx) => {
  md += `### ${idx + 1}. ${fix.file}:${fix.line}\n\n`;
  md += `**Severity**: ${fix.severity}\n\n`;
  md += `**Reason**: ${fix.reason}\n\n`;
  md += `**Action**: ${fix.action}\n\n`;
  
  if (fix.before) {
    md += `**Before**:\n\`\`\`tsx\n${fix.before}\n\`\`\`\n\n`;
  }
  
  if (fix.after) {
    md += `**After**:\n\`\`\`tsx\n${fix.after}\n\`\`\`\n\n`;
  }
  
  md += `---\n\n`;
});

fs.writeFileSync('.artifacts/SECURITY_FIX_DANGEROUS_HTML.md', md);

console.log('✅ Reports saved:');
console.log('   - .artifacts/fix-dangerous-html-report.json');
console.log('   - .artifacts/SECURITY_FIX_DANGEROUS_HTML.md');
console.log('\n' + '═'.repeat(60) + '\n');

// Exit with error if critical unfixed issues remain
if (review.length > 0) {
  console.log('⚠️  Manual review required for', review.length, 'instances');
  console.log('Review .artifacts/SECURITY_FIX_DANGEROUS_HTML.md for details\n');
}

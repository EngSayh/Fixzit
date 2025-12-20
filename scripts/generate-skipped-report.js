#!/usr/bin/env node

/**
 * Generate SKIPPED_TESTS.md report from vitest.json output
 * 
 * This script reads the vitest JSON output and generates a markdown report
 * of all skipped tests, with warnings for tests that don't have ticket references.
 * 
 * Usage: node scripts/generate-skipped-report.js
 * 
 * Expected vitest.json structure:
 * {
 *   testResults: [
 *     {
 *       name: "file.test.ts",
 *       assertionResults: [
 *         { fullName: "test name", status: "skipped|passed|failed", ... }
 *       ]
 *     }
 *   ]
 * }
 * 
 * @module scripts/generate-skipped-report
 */

const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(process.cwd(), 'reports', 'vitest.json');
const OUTPUT_PATH = path.join(process.cwd(), 'reports', 'SKIPPED_TESTS.md');

// Pattern to detect ticket references (e.g., FIX-123, FIXZIT-456, #123)
const TICKET_PATTERN = /(FIX-\d+|FIXZIT-\d+|#\d+)/i;

function main() {
  console.log('📊 Generating Skipped Tests Report...\n');

  if (!fs.existsSync(JSON_PATH)) {
    console.log('⚠️  No vitest.json found. Run tests with CI=true first.\n');
    console.log(`   CI=true pnpm vitest run\n`);
    process.exit(0);
  }

  const raw = fs.readFileSync(JSON_PATH, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('❌ Failed to parse vitest.json:', e.message);
    process.exit(1);
  }

  // Vitest JSON format has testResults array
  const testResults = data.testResults || [];
  
  const skippedTests = [];
  const todoTests = [];
  
  for (const file of testResults) {
    const fileName = file.name || file.file || 'unknown';
    const assertions = file.assertionResults || [];
    
    for (const test of assertions) {
      if (test.status === 'skipped' || test.status === 'pending') {
        skippedTests.push({
          file: fileName,
          name: test.fullName || test.title || 'unnamed',
          hasTicket: TICKET_PATTERN.test(test.fullName || ''),
        });
      }
      if (test.status === 'todo') {
        todoTests.push({
          file: fileName,
          name: test.fullName || test.title || 'unnamed',
          hasTicket: TICKET_PATTERN.test(test.fullName || ''),
        });
      }
    }
  }

  // Generate markdown report
  const lines = [
    '# Skipped Tests Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `| Metric | Count |`,
    `|--------|-------|`,
    `| Total Skipped | ${skippedTests.length} |`,
    `| Total Todo | ${todoTests.length} |`,
    `| Skipped Without Ticket | ${skippedTests.filter(t => !t.hasTicket).length} |`,
    `| Todo Without Ticket | ${todoTests.filter(t => !t.hasTicket).length} |`,
    '',
  ];

  if (skippedTests.length > 0) {
    lines.push('## Skipped Tests', '');
    
    const withTicket = skippedTests.filter(t => t.hasTicket);
    const withoutTicket = skippedTests.filter(t => !t.hasTicket);
    
    if (withoutTicket.length > 0) {
      lines.push('### ⚠️ Without Ticket Reference', '');
      lines.push('These tests should include a ticket reference (e.g., FIX-123, #456):', '');
      for (const t of withoutTicket) {
        lines.push(`- \`${t.file}\`: ${t.name}`);
      }
      lines.push('');
    }
    
    if (withTicket.length > 0) {
      lines.push('### ✓ With Ticket Reference', '');
      for (const t of withTicket) {
        lines.push(`- \`${t.file}\`: ${t.name}`);
      }
      lines.push('');
    }
  }

  if (todoTests.length > 0) {
    lines.push('## Todo Tests', '');
    for (const t of todoTests) {
      const marker = t.hasTicket ? '✓' : '⚠️';
      lines.push(`- ${marker} \`${t.file}\`: ${t.name}`);
    }
    lines.push('');
  }

  if (skippedTests.length === 0 && todoTests.length === 0) {
    lines.push('✅ No skipped or todo tests found.', '');
  }

  const content = lines.join('\n');
  fs.writeFileSync(OUTPUT_PATH, content, 'utf8');
  
  console.log(`✅ Report written to ${OUTPUT_PATH}`);
  console.log(`   Skipped: ${skippedTests.length}, Todo: ${todoTests.length}`);
  
  // Warn if skipped without tickets
  const noTicket = skippedTests.filter(t => !t.hasTicket).length;
  if (noTicket > 0) {
    console.log(`\n⚠️  ${noTicket} skipped test(s) without ticket reference.`);
    console.log('   Consider adding FIX-XXX or #XXX to the test name.\n');
  }
  
  process.exit(0);
}

main();

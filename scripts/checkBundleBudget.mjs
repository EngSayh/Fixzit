#!/usr/bin/env node
/**
 * Bundle Budget CI Gate (PROC-001)
 *
 * Checks that production bundle sizes stay within defined thresholds.
 * Fails CI if any bundle exceeds its budget (gzip sizes).
 *
 * Usage:
 *   node scripts/checkBundleBudget.mjs
 *   node scripts/checkBundleBudget.mjs --report
 *
 * @see https://web.dev/performance-budgets-101/
 */

import { readdirSync, statSync, readFileSync } from 'fs';
import { join, basename } from 'path';
import { gzipSync } from 'zlib';

// Budget thresholds in KB (gzipped)
const BUDGETS = {
  // Main app chunks
  'main-app': 150,           // Main app bundle
  'framework': 100,          // React/Next.js framework
  'commons': 80,             // Shared components

  // Feature chunks
  'sentry': 200,             // Sentry SDK (monitoring - required)
  'copilot': 300,            // AI CopilotWidget
  'i18n': 100,               // Per-locale dictionary

  // Vendor chunks
  'vendor': 200,             // Third-party libraries
  'polyfills': 50,           // Browser polyfills

  // Page chunks (per-route)
  'page': 50,                // Individual page chunks

  // Default for unlisted chunks
  'default': 100,
};

// Patterns to skip
const SKIP_PATTERNS = [
  /\.map$/,                  // Source maps
  /webpack-/,                // Webpack runtime
  /buildManifest/,           // Build manifests
  /ssgManifest/,
  /_buildManifest/,
  /_ssgManifest/,
];

/**
 * Get gzipped size of a file
 */
function getGzipSize(filePath) {
  try {
    const content = readFileSync(filePath);
    const gzipped = gzipSync(content);
    return gzipped.length;
  } catch {
    return 0;
  }
}

/**
 * Format bytes as human-readable KB
 */
function formatKB(bytes) {
  return (bytes / 1024).toFixed(2) + ' KB';
}

/**
 * Determine budget category for a chunk
 */
function getBudgetCategory(filename) {
  const lower = filename.toLowerCase();

  if (lower.includes('main-app')) return 'main-app';
  if (lower.includes('framework')) return 'framework';
  if (lower.includes('commons')) return 'commons';
  if (lower.includes('sentry')) return 'sentry';
  if (lower.includes('copilot')) return 'copilot';
  if (lower.includes('i18n') || lower.includes('dictionary')) return 'i18n';
  if (lower.includes('vendor')) return 'vendor';
  if (lower.includes('polyfill')) return 'polyfills';
  if (lower.includes('page') || lower.includes('app-')) return 'page';

  return 'default';
}

/**
 * Scan chunks directory and check budgets
 */
function checkBundles() {
  const chunksDir = join(process.cwd(), '.next', 'static', 'chunks');

  let files;
  try {
    files = readdirSync(chunksDir, { recursive: true });
  } catch (error) {
    console.error('❌ No .next/static/chunks directory found.');
    console.error('   Run `pnpm build` first to generate production bundles.');
    process.exit(1);
  }

  const results = [];
  let totalSize = 0;
  let violations = [];

  for (const file of files) {
    const filePath = join(chunksDir, file.toString());

    // Skip directories and non-JS files
    try {
      if (statSync(filePath).isDirectory()) continue;
    } catch {
      continue;
    }

    if (!file.toString().endsWith('.js')) continue;

    // Skip patterns
    const filename = basename(file.toString());
    if (SKIP_PATTERNS.some(p => p.test(filename))) continue;

    const gzipSize = getGzipSize(filePath);
    const gzipKB = gzipSize / 1024;
    const category = getBudgetCategory(filename);
    const budget = BUDGETS[category];

    totalSize += gzipSize;

    const result = {
      file: filename,
      category,
      size: gzipKB,
      budget,
      overBudget: gzipKB > budget,
      delta: gzipKB - budget,
    };

    results.push(result);

    if (result.overBudget) {
      violations.push(result);
    }
  }

  return { results, violations, totalSize };
}

/**
 * Print report
 */
function printReport(results, violations, totalSize) {
  console.log('\n📊 Bundle Budget Report\n');
  console.log('=' .repeat(70));

  // Sort by size descending
  const sorted = [...results].sort((a, b) => b.size - a.size);

  // Top 10 largest
  console.log('\n🔝 Top 10 Largest Chunks (gzipped):');
  console.log('-'.repeat(70));
  console.log('File'.padEnd(40) + 'Size'.padStart(12) + 'Budget'.padStart(12) + 'Status'.padStart(10));
  console.log('-'.repeat(70));

  for (const r of sorted.slice(0, 10)) {
    const status = r.overBudget ? '❌ OVER' : '✅ OK';
    console.log(
      r.file.substring(0, 38).padEnd(40) +
      formatKB(r.size * 1024).padStart(12) +
      formatKB(r.budget * 1024).padStart(12) +
      status.padStart(10)
    );
  }

  console.log('-'.repeat(70));
  console.log(`Total: ${formatKB(totalSize)} | Chunks: ${results.length}`);

  // Violations
  if (violations.length > 0) {
    console.log('\n❌ Budget Violations:');
    console.log('-'.repeat(70));
    for (const v of violations) {
      console.log(`  ${v.file}`);
      console.log(`    Category: ${v.category} | Size: ${formatKB(v.size * 1024)} | Budget: ${formatKB(v.budget * 1024)} | Over by: ${formatKB(v.delta * 1024)}`);
    }
  }

  console.log('\n');
}

/**
 * Main
 */
function main() {
  const args = process.argv.slice(2);
  const reportMode = args.includes('--report');

  console.log('🔍 Checking bundle budgets...\n');

  const { results, violations, totalSize } = checkBundles();

  if (reportMode || violations.length > 0) {
    printReport(results, violations, totalSize);
  }

  if (violations.length > 0) {
    console.log(`❌ ${violations.length} bundle(s) exceeded budget!`);
    console.log('   Consider code splitting, lazy loading, or removing unused dependencies.');
    process.exit(1);
  }

  console.log(`✅ All ${results.length} bundles within budget (${formatKB(totalSize)} total gzipped)`);
  process.exit(0);
}

main();

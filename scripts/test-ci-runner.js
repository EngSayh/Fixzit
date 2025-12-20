#!/usr/bin/env node

/**
 * CI Test Runner with Artifact Safety
 * 
 * Runs Vitest, captures exit code, generates reports, then exits with original code.
 * This ensures CI fails on test failures but artifacts are always produced.
 * 
 * Usage: node scripts/test-ci-runner.js
 * 
 * @module scripts/test-ci-runner
 */

const { spawn } = require('child_process');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPORTS_DIR = path.join(process.cwd(), 'reports');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

console.log('🧪 CI Test Runner - Starting...\n');

// Build vitest command with all reporters
const vitestArgs = [
  'vitest', 'run',
  '--project=server',
  '--maxWorkers=2',
  '--reporter=default',
  '--reporter=junit',
  '--reporter=json',
  '--outputFile.junit=reports/junit-vitest.xml',
  '--outputFile.json=reports/vitest.json',
];

// Set environment
const env = {
  ...process.env,
  CI: 'true',
  NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=4096',
};

console.log(`📦 Running: pnpm ${vitestArgs.join(' ')}\n`);

// Run vitest and capture exit code
const vitest = spawn('pnpm', vitestArgs, {
  stdio: 'inherit',
  env,
  shell: true,
});

vitest.on('close', (exitCode) => {
  console.log(`\n📊 Vitest completed with exit code: ${exitCode}`);
  
  // Generate skipped report regardless of test outcome
  console.log('\n📋 Generating skipped tests report...');
  try {
    execSync('node scripts/generate-skipped-report.js', { stdio: 'inherit' });
  } catch (e) {
    console.log('⚠️  Skipped report generation failed (non-fatal)');
  }
  
  // Verify artifacts
  console.log('\n🔍 Verifying artifacts...');
  const artifacts = [
    'reports/junit-vitest.xml',
    'reports/vitest.json',
    'reports/SKIPPED_TESTS.md',
  ];
  
  let allPresent = true;
  for (const artifact of artifacts) {
    const fullPath = path.join(process.cwd(), artifact);
    const exists = fs.existsSync(fullPath);
    const size = exists ? fs.statSync(fullPath).size : 0;
    const status = exists && size > 0 ? '✅' : exists ? '⚠️ (empty)' : '❌';
    console.log(`   ${status} ${artifact} (${size} bytes)`);
    if (!exists || size === 0) allPresent = false;
  }
  
  if (!allPresent) {
    console.log('\n⚠️  Some artifacts are missing or empty');
  }
  
  // Exit with original vitest exit code
  console.log(`\n🏁 Exiting with code: ${exitCode}`);
  process.exit(exitCode || 0);
});

vitest.on('error', (err) => {
  console.error('❌ Failed to start vitest:', err.message);
  process.exit(1);
});

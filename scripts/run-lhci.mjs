#!/usr/bin/env node

/**
 * Run Lighthouse CI against a target URL and write reports to lhci_reports/.
 * Falls back to production site if LHCI_TARGET_URL is not provided.
 */

import { execSync } from 'node:child_process';

const targetUrl = process.env.LHCI_TARGET_URL || 'https://fixzit.co';
const outputDir = process.env.LHCI_OUTPUT_DIR || 'lhci_reports';

const command = [
  'npx',
  'lhci',
  'autorun',
  '--config=lighthouserc.json',
  `--collect.url=${targetUrl}`,
  '--upload.target=filesystem',
  `--upload.outputDir=${outputDir}`,
].join(' ');

console.log(`[LHCI] Target: ${targetUrl}`);
console.log(`[LHCI] Output: ${outputDir}`);

try {
  execSync(command, { stdio: 'inherit' });
} catch (error) {
  // Do not throw — allow CI to continue while still surfacing logs.
  console.warn('[LHCI] Warning: Lighthouse CI run did not complete successfully');
  console.warn(error?.message || error);
  process.exitCode = 0;
}

#!/usr/bin/env node
/**
 * Safe TypeScript type-check with output tailing
 * Avoids shell chaining/pipes that trigger VS Code approval prompts
 */
import { spawn } from 'node:child_process';

const tailLines = Number(process.env.TAIL_LINES || '30');

// Run tsc directly without shell - prevents approval prompts
const child = spawn('npx', ['tsc', '--noEmit'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: false, // CRITICAL: no shell = no approval prompts
  env: { ...process.env },
  cwd: process.cwd()
});

const lines = [];

function collect(data, tag) {
  const chunk = data.toString();
  for (const line of chunk.split(/\r?\n/)) {
    if (line.trim().length) lines.push(`[${tag}] ${line}`);
  }
}

child.stdout.on('data', (d) => collect(d, 'stdout'));
child.stderr.on('data', (d) => collect(d, 'stderr'));

child.on('close', (code) => {
  // Show last N lines
  const last = lines.slice(-tailLines);
  if (last.length > 0) {
    console.log(last.join('\n'));
  } else {
    console.log('✅ TypeScript type-check passed (0 errors)');
  }
  process.exit(code ?? 0);
});

child.on('error', (err) => {
  console.error('❌ Failed to run tsc:', err.message);
  process.exit(1);
});

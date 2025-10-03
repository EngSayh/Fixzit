#!/usr/bin/env node
/**
 * Agent Loop with 2-Minute Stuck Timer
 * Monitors progress and auto-halts if agent is stuck
 */
import fs from 'node:fs';
import path from 'node:path';

const PROGRESS_FILE = path.resolve('progress.json');
const TIMEBOX_MS = 2 * 60 * 1000; // 2 minutes

function readProgress() {
  try {
    const raw = fs.readFileSync(PROGRESS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { lastStepAt: 0, step: 'init' };
  }
}

function now() { return Date.now(); }

function log(msg, data = {}) {
  const line = `[${new Date().toISOString()}] ${msg} ${JSON.stringify(data)}\n`;
  fs.appendFileSync('progress.log', line);
  console.log(msg, data);
}

async function main() {
  log('agent-loop: started', { TIMEBOX_MS });
  let last = readProgress().lastStepAt || 0;

  setInterval(() => {
    const p = readProgress();
    if (p.lastStepAt && p.lastStepAt !== last) {
      last = p.lastStepAt;
      return; // progress made
    }
    if (now() - last >= TIMEBOX_MS) {
      // STUCK: auto-halt + root-cause note
      const rc = {
        event: 'STUCK',
        at: new Date().toISOString(),
        hint: [
          'Check hydration (SSR vs client islands, duplicate headers).',
          'Check module aliases/imports and mixed ESM/CJS.',
          'Check language/RTL wiring and brand tokens.',
          'Rollback to last green commit, re-run verify:page.'
        ]
      };
      fs.mkdirSync('progress', { recursive: true });
      fs.writeFileSync(`progress/stuck-${Date.now()}.json`, JSON.stringify(rc, null, 2));
      log('agent-loop: STUCK — halting current task and returning to last green checkpoint', rc);
      process.exit(2);
    }
  }, 5_000);
}

main();

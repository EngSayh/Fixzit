#!/usr/bin/env node
/**
 * Fixzit cross-device Git sync guard.
 *
 * Goal: prevent "stale file" work when coding on Mac + Windows.
 *
 * Fails (exit 1) when:
 *  - the repo is behind the chosen base ref (default: origin/main)
 *  - and/or the working tree is dirty when --require-clean is set
 *
 * Usage:
 *   node scripts/git-preflight.mjs
 *   node scripts/git-preflight.mjs --base origin/main --require-clean
 *   node scripts/git-preflight.mjs --no-fetch
 */

import { execSync } from 'node:child_process';

function run(cmd, { allowFail = false } = {}) {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
  } catch (err) {
    if (allowFail) return null;
    const msg = err?.stderr?.toString?.() || err?.message || String(err);
    throw new Error(`${cmd}\n${msg}`);
  }
}

const args = new Set(process.argv.slice(2));
const baseArgIndex = process.argv.indexOf('--base');
const baseArg = baseArgIndex > -1 ? process.argv[baseArgIndex + 1] : 'origin/main';
// SEC-CMD-001: Validate base ref to prevent command injection
// Only allow alphanumeric, forward slash, hyphen, underscore, and dot
if (!/^[a-zA-Z0-9/_.-]+$/.test(baseArg)) {
  console.error(`[git-preflight] ERROR: Invalid base ref format: ${baseArg}`);
  console.error('[git-preflight] HINT: Use refs like "origin/main" or "HEAD~1"');
  process.exit(1);
}
const base = baseArg;
const doFetch = !args.has('--no-fetch');
const requireClean = args.has('--require-clean');

// 1) Ensure we're in a git repo
const inside = run('git rev-parse --is-inside-work-tree', { allowFail: true })?.trim();
if (inside !== 'true') {
  console.error('[git-preflight] ERROR: Not inside a Git repository.');
  process.exit(1);
}

// 2) Fetch remote (best-effort)
if (doFetch) {
  const fetched = run('git fetch --prune origin', { allowFail: true });
  if (fetched === null) {
    console.warn('[git-preflight] WARN: git fetch failed (offline / auth / no remote). Continuing with local refs.');
  }
}

// 3) Optional: require clean working tree
if (requireClean) {
  const status = run('git status --porcelain').trim();
  if (status) {
    console.error('[git-preflight] ERROR: Working tree is not clean. Commit/stash changes before starting a task.');
    console.error(status.split('\n').slice(0, 20).join('\n'));
    process.exit(1);
  }
}

// 4) Determine behind/ahead vs base
const baseSha = run(`git rev-parse ${base}`, { allowFail: true })?.trim();
if (!baseSha) {
  console.error(`[git-preflight] ERROR: Cannot resolve base ref: ${base}`);
  console.error('[git-preflight] HINT: Run: git fetch origin main --prune');
  process.exit(1);
}

const rangeCounts = run(`git rev-list --left-right --count ${base}...HEAD`).trim();
const [behindStr, aheadStr] = rangeCounts.split(/\s+/);
const behind = Number.parseInt(behindStr ?? '0', 10);
const ahead = Number.parseInt(aheadStr ?? '0', 10);

const branch = run('git rev-parse --abbrev-ref HEAD').trim();

if (behind > 0) {
  console.error(`[git-preflight] ERROR: Branch '${branch}' is BEHIND ${base} by ${behind} commits.`);
  console.error('[git-preflight] ACTION: Update before claiming work:');
  console.error('  git pull --rebase origin main');
  process.exit(1);
}

// Success / warnings
console.log(`[git-preflight] OK: '${branch}' is up-to-date with ${base}.`);
if (ahead > 0) {
  console.warn(`[git-preflight] WARN: '${branch}' is AHEAD of ${base} by ${ahead} commits (un-pushed or diverged).`);
  console.warn('[git-preflight] ACTION: Push or open PR before switching devices:');
  console.warn('  git push -u origin HEAD');
}

#!/usr/bin/env node
/**
 * Noise-reduced ts-prune runner
 *
 * - Runs ts-prune against the main tsconfig
 * - Filters out entries that are re-exported via local index.* barrels
 * - Exits non-zero only when actionable unused exports remain
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

const passthroughArgs = process.argv.slice(2);
const tsPruneArgs = [
  'exec',
  'ts-prune',
  '--project',
  'tsconfig.json',
  '--error',
  '--skipIndexFiles',
  ...passthroughArgs,
];

const result = spawnSync('pnpm', tsPruneArgs, {
  encoding: 'utf8',
  stdio: ['inherit', 'pipe', 'pipe'],
});

if (result.error) {
  console.error('[ts-prune] Failed to launch ts-prune:', result.error.message);
  process.exit(1);
}

const rawOutput = result.stdout || '';
const lines = rawOutput
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

const indexFiles = ['index.ts', 'index.tsx', 'index.mts', 'index.mjs', 'index.js'];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function isSuppressedByIndex(line) {
  const match = line.match(/^(.*?):\d+\s+-\s+(.*)$/);
  if (!match) return false;

  const [, relativePath, exportName] = match;
  const absPath = resolve(process.cwd(), relativePath);
  const dir = dirname(absPath);
  const stem = basename(absPath).replace(/\.[^.]+$/, '');

  for (const candidate of indexFiles) {
    const indexPath = join(dir, candidate);
    if (!existsSync(indexPath)) continue;

    const content = readFileSync(indexPath, 'utf8');
    const stemPattern = escapeRegExp(stem);
    const exportPattern = escapeRegExp(exportName);

    // export * from './file'
    if (new RegExp(`export\\s+\\*\\s+from\\s+['"]\\.\\/${stemPattern}['"]`).test(content)) {
      return true;
    }

    // export { Foo } from './file'
    if (
      new RegExp(
        `export\\s+{[^}]*\\b${exportPattern}\\b[^}]*}\\s+from\\s+['"]\\.\\/${stemPattern}['"]`,
      ).test(content)
    ) {
      return true;
    }

    // export { default as Foo } from './file'
    if (
      exportName === 'default' &&
      new RegExp(`export\\s+{[^}]*\\bdefault\\b[^}]*}\\s+from\\s+['"]\\.\\/${stemPattern}['"]`).test(
        content,
      )
    ) {
      return true;
    }
  }

  return false;
}

const suppressed = [];
const remaining = [];

for (const line of lines) {
  if (isSuppressedByIndex(line)) {
    suppressed.push(line);
  } else {
    remaining.push(line);
  }
}

if (result.stderr?.trim()) {
  console.error(result.stderr.trim());
}

if (remaining.length > 0) {
  console.log(remaining.join('\n'));
  process.exit(1);
}

if (lines.length === 0 && (result.status ?? 0) !== 0) {
  console.error(`[ts-prune] ts-prune exited with code ${result.status ?? 1} and no output.`);
  process.exit(result.status ?? 1);
}

if (suppressed.length > 0) {
  console.error(
    `[ts-prune] Suppressed ${suppressed.length}/${lines.length} entries re-exported via index.* barrels.`,
  );
}

process.exit(0);

#!/usr/bin/env node
/**
 * Vitest sharding helper for CI runners.
 *
 * Usage:
 *   SHARD_INDEX=1 SHARD_TOTAL=4 node scripts/vitest-shard.mjs
 *   SHARD_INDEX=2 SHARD_TOTAL=4 VITEST_PROJECT=server node scripts/vitest-shard.mjs --bail 1
 */

import { spawnSync } from 'node:child_process';

const shardIndexRaw = Number.parseInt(process.env.SHARD_INDEX ?? '', 10);
const shardTotalRaw = Number.parseInt(process.env.SHARD_TOTAL ?? '', 10);

const shardIndex = Number.isFinite(shardIndexRaw) && shardIndexRaw > 0 ? shardIndexRaw : 1;
const shardTotal = Number.isFinite(shardTotalRaw) && shardTotalRaw > 0 ? shardTotalRaw : 1;

if (shardIndex > shardTotal) {
  console.error(
    `[vitest-shard] SHARD_INDEX (${shardIndex}) must be <= SHARD_TOTAL (${shardTotal}).`,
  );
  process.exit(1);
}

const config = process.env.VITEST_CONFIG ?? 'vitest.config.ts';
const project = process.env.VITEST_PROJECT;
const extraArgs = process.argv.slice(2);

const vitestArgs = ['exec', 'vitest', '-c', config, 'run', '--shard', `${shardIndex}/${shardTotal}`];

if (project) {
  vitestArgs.push('--project', project);
}

vitestArgs.push(...extraArgs);

const result = spawnSync('pnpm', vitestArgs, {
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  console.error('[vitest-shard] Failed to launch vitest:', result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);

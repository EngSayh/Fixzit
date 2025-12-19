#!/usr/bin/env node
import os from 'node:os';
import { spawn } from 'node:child_process';

const parsePositiveInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const totalMb = Math.floor(os.totalmem() / 1024 / 1024);
const reserveMb = Math.max(256, Math.floor(totalMb * 0.25));
const computedMb = Math.max(256, totalMb - reserveMb);
const overrideMb = parsePositiveInt(process.env.FIXZIT_BUILD_MAX_OLD_SPACE_MB);
const targetMb = overrideMb ?? computedMb;
const existingNodeOptions = process.env.NODE_OPTIONS ?? '';
const cleanedNodeOptions = existingNodeOptions
  .replace(/--max-old-space-size=\d+/g, '')
  .replace(/\s+/g, ' ')
  .trim();
const nodeOptions = [cleanedNodeOptions, `--max-old-space-size=${targetMb}`]
  .filter(Boolean)
  .join(' ');

const child = spawn('next', ['build'], {
  env: {
    ...process.env,
    NODE_OPTIONS: nodeOptions,
  },
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(1);
  }
  process.exit(code ?? 1);
});

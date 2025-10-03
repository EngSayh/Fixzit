#!/usr/bin/env node
/**
 * Progress Reporter - Live Updates
 * Tracks progress for stuck timer
 */
import fs from 'node:fs';

const cmd = process.argv[2] || 'step';
const stamp = Date.now();

const state = {
  lastStepAt: stamp,
  step: process.env.PROGRESS_STEP || 'unspecified',
  note: process.env.PROGRESS_NOTE || ''
};

fs.mkdirSync('progress', { recursive: true });
fs.writeFileSync('progress.json', JSON.stringify(state, null, 2));
fs.appendFileSync('progress.log', `[${new Date(stamp).toISOString()}] ${cmd.toUpperCase()} ${state.step} ${state.note}\n`);
console.log('progress updated:', state);

#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

async function* walkDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== '.git') {
        yield* walkDir(path);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      yield path;
    }
  }
}

async function checkFmHooks() {
  const fmDir = 'app/fm';
  const pattern = 'eslint-disable react-hooks/rules-of-hooks';
  let found = false;

  for await (const file of walkDir(fmDir)) {
    const content = await readFile(file, 'utf-8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(pattern)) {
        console.log(`${file}:${i + 1}: ${lines[i].trim()}`);
        found = true;
      }
    }
  }

  if (found) {
    console.error('\n❌ Found react-hooks/rules-of-hooks disables in app/fm (use FmGuardedPage)');
    process.exit(1);
  }
}

checkFmHooks().catch(err => {
  console.error('Error checking FM hooks:', err);
  process.exit(1);
});

#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import process from 'process';

const ROOTS = ['app', 'src'];
const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const patterns = [
  /(^|[^A-Za-z0-9_])require\s*\(/,
  /(^|[^A-Za-z0-9_])module\.exports\b/,
  /(^|[^A-Za-z0-9_])exports\./
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, files);
    else if (EXTS.has(path.extname(entry.name))) files.push(abs);
  }
  return files;
}

function read(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}

function check(files) {
  const offenders = [];
  for (const f of files) {
    const src = read(f);
    if (!src) continue;
    for (const rx of patterns) {
      if (rx.test(src)) { offenders.push(f); break; }
    }
  }
  return offenders;
}

let files = process.argv.slice(2).filter(p => {
  const extOk = EXTS.has(path.extname(p));
  const withinRoots = ROOTS.some(r => p.split(path.sep)[0] === r);
  return extOk && withinRoots && fs.existsSync(p) && fs.statSync(p).isFile();
});

if (files.length === 0) {
  files = ROOTS.flatMap(r => walk(path.resolve(process.cwd(), r)));
}

const offenders = check(files);
if (offenders.length) {
  console.error('\n❌ CommonJS usage detected in app/src (disallowed under Next.js App Router):\n');
  offenders.forEach(f => console.error(' -', path.relative(process.cwd(), f)));
  console.error('\nFix by converting to ESM imports/exports. Commit aborted.\n');
  process.exit(1);
}
console.log('✅ No CommonJS usage detected in app/src.');

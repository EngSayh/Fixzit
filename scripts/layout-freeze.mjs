import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { globby } from 'globby';

const LOCK_PATH = '.fixzit/layout.hash.json';
const CFG_PATH = 'fixzit.lock.yml';

function sha256(file) {
  const buf = fs.readFileSync(file);
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
}

function readPatterns() {
  if (!fs.existsSync(CFG_PATH)) return [];
  const text = fs.readFileSync(CFG_PATH, 'utf8');
  const lines = text.split(/\r?\n/);
  const pats = [];
  let on = false;
  for (const l of lines) {
    if (l.trim().startsWith('protected:')) { on = true; continue; }
    if (on && l.trim().startsWith('- ')) pats.push(l.trim().slice(2));
  }
  return pats;
}

async function collect() {
  const patterns = readPatterns();
  if (patterns.length === 0) return [];
  const files = await globby(patterns, { dot: false, onlyFiles: true });
  return files.sort();
}

async function baseline() {
  const files = await collect();
  const rec = Object.fromEntries(files.map(f => [f, sha256(f)]));
  fs.mkdirSync(path.dirname(LOCK_PATH), { recursive: true });
  fs.writeFileSync(LOCK_PATH, JSON.stringify(rec, null, 2));
  console.log(`Baseline saved for ${files.length} files.`);
}

async function check() {
  if (!fs.existsSync(LOCK_PATH)) {
    console.error('No baseline found. Run: npm run layout:baseline');
    process.exit(1);
  }
  const baseline = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
  const files = await collect();
  const diffs = [];
  for (const f of files) {
    const hash = sha256(f);
    if (!baseline[f]) diffs.push({ file: f, issue: 'new-or-moved' });
    else if (baseline[f] !== hash) diffs.push({ file: f, issue: 'modified' });
  }
  if (diffs.length) {
    console.error('Layout Freeze violation:');
    diffs.forEach(d => console.error(` - ${d.file} (${d.issue})`));
    process.exit(1);
  }
  console.log('Layout Freeze check passed.');
}

const cmd = process.argv[2];
if (cmd === 'baseline') baseline();
else if (cmd === 'check') check();
else console.log('Usage: node scripts/layout-freeze.mjs <baseline|check>');



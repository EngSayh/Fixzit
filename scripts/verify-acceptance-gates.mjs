#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import cp from 'child_process';

if (process.env.SKIP_ACCEPTANCE === '1') {
  console.log('⚠️  SKIP_ACCEPTANCE=1 set – acceptance gates bypassed.');
  process.exit(0);
}

const ROOT = process.cwd();
const AR = 'ar';
const EN = 'en';

const exists = p => { try { fs.accessSync(p); return true; } catch { return false; } };
const read = p => fs.readFileSync(p, 'utf8');
const list = dir => exists(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : [];
const isFile = p => { try { return fs.statSync(p).isFile(); } catch { return false; } };

function flatten(obj, prefix = '', out = {}) {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      flatten(v, key, out);
    }
  } else {
    out[prefix] = obj;
  }
  return out;
}
function loadJsonSafe(file) { try { return JSON.parse(read(file)); } catch { return {}; } }
function globJson(dir) { return list(dir).filter(e => e.isFile() && e.name.toLowerCase().endsWith('.json')).map(e => path.join(dir, e.name)); }
function mergeLocales(dir) { return globJson(dir).reduce((acc, f) => Object.assign(acc, loadJsonSafe(f)), {}); }

function detectLocaleRoots() {
  const candidates = ['public/locales','src/locales','src/i18n','locales'].map(p => path.join(ROOT, p));
  for (const root of candidates) {
    if (exists(path.join(root, EN)) && exists(path.join(root, AR))) {
      return { root, en: path.join(root, EN), ar: path.join(root, AR) };
    }
  }
  return null;
}

function collectLocaleMaps() {
  const det = detectLocaleRoots();
  if (!det) return null;
  const enFlat = flatten(mergeLocales(det.en));
  const arFlat = flatten(mergeLocales(det.ar));
  return { enFlat, arFlat };
}

function getChangedFilesFromGit() {
  try {
    const out = cp.execSync('git diff --cached --name-only', { encoding: 'utf8' });
    return out.split('\n').map(s => s.trim()).filter(Boolean);
  } catch { return []; }
}

const I18N_PATTERNS = [
  /(?:^|[^A-Za-z0-9_])t\(\s*['"`]([^'"`]+)['"`]\s*[\),]/g,
  /(?:^|[^A-Za-z0-9_])i18n\.t\(\s*['"`]([^'"`]+)['"`]\s*[\),]/g,
  /(?:^|[^A-Za-z0-9_])translate\(\s*['"`]([^'"`]+)['"`]\s*[\),]/g,
];

function extractKeys(src) {
  const keys = new Set();
  for (const rx of I18N_PATTERNS) {
    let m; while ((m = rx.exec(src))) keys.add(m[1]);
  }
  return [...keys];
}

function isBadValue(v) {
  if (v == null) return true;
  if (typeof v !== 'string') return true;
  const s = v.trim(); if (!s) return true;
  const bad = ['TODO','PLACEHOLDER','___','TBD','lorem ipsum'];
  return bad.includes(s.toUpperCase()) || bad.some(b => s.includes(b));
}

function readChangedSources(files) {
  const candidates = files.length ? files : getChangedFilesFromGit();
  const list = candidates.filter(f => /\.(tsx?|jsx?)$/.test(f) && (f.startsWith('app/') || f.startsWith('src/')));
  return list.map(f => ({ file: f, src: isFile(f) ? read(f) : '' }));
}

function findRootLayout() {
  const options = ['app/layout.tsx','app/layout.ts','src/app/layout.tsx','src/app/layout.ts'];
  for (const p of options) if (isFile(p)) return { path: p, src: read(p) };
  return null;
}
function checkGlobalChrome(layoutSrc) {
  const hasHeader = /<\s*(Header|TopBar)\b/.test(layoutSrc);
  const hasFooter = /<\s*Footer\b/.test(layoutSrc);
  return { hasHeader, hasFooter };
}
function pageImportsOwnChrome(src) { return /from\s+['"][^'"]*(Header|TopBar|Footer)['"]/.test(src); }

const staged = process.argv.slice(2).filter(Boolean);
const issues = [];

// i18n checks
const locales = collectLocaleMaps();
if (!locales) {
  issues.push('Locales not found: expected EN and AR under public/locales or src/locales or src/i18n or locales.');
} else {
  const changed = readChangedSources(staged);
  const keyToFiles = new Map();
  for (const { file, src } of changed) {
    for (const k of extractKeys(src)) {
      if (!keyToFiles.has(k)) keyToFiles.set(k, new Set());
      keyToFiles.get(k).add(file);
    }
  }
  const missing = [];
  for (const [k, files] of keyToFiles) {
    const en = locales.enFlat[k]; const ar = locales.arFlat[k];
    if (isBadValue(en) || isBadValue(ar)) missing.push({ k, files: [...files], en, ar });
  }
  if (missing.length) {
    issues.push('i18n: Missing or invalid AR/EN translations:');
    for (const m of missing) {
      const enVal = (m.en === undefined) ? '<missing>' : JSON.stringify(m.en);
      const arVal = (m.ar === undefined) ? '<missing>' : JSON.stringify(m.ar);
      issues.push(`  - ${m.k} | EN=${enVal} | AR=${arVal} | used in: ${m.files.join(', ')}`);
    }
  }
}

// layout checks
const rootLayout = findRootLayout();
if (!rootLayout) issues.push('Global layout not found: expected app/layout.(ts|tsx) or src/app/layout.(ts|tsx).');
else {
  const { hasHeader, hasFooter } = checkGlobalChrome(rootLayout.src);
  if (!hasHeader) issues.push(`Global layout "${rootLayout.path}" does not render <Header/> or <TopBar/>.`);
  if (!hasFooter) issues.push(`Global layout "${rootLayout.path}" does not render <Footer/>.`);
}

// no duplicate chrome in pages
for (const { file, src } of readChangedSources(staged)) {
  if (/(?:^|\/)page\.(t|j)sx?$/.test(file) || /(?:^|\/)layout\.(t|j)sx?$/.test(file)) {
    if (pageImportsOwnChrome(src)) issues.push(`Page/layout imports header/footer directly (dup risk): ${file}`);
  }
}

if (issues.length) {
  console.error('\n❌ Acceptance gates failed:\n');
  for (const line of issues) console.error(line);
  console.error('\nFix the above before committing. (Set SKIP_ACCEPTANCE=1 only for emergency CI hotfix.)\n');
  process.exit(1);
}

console.log('✅ Acceptance gates passed (AR/EN i18n + global header/footer).');
process.exit(0);

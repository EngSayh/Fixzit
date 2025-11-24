#!/usr/bin/env node
/**
 * Fixzit — Comprehensive Translation Audit (ESM, no deps)
 * - Scans TranslationContext.tsx for ar/en catalogs (nested-safe)
 * - Scans codebase for t('...'), t("..."), <Trans i18nKey="...">, namespaces, and ns in options
 * - Emits console report + JSON/CSV artifacts
 * - Optional --fix adds missing keys to both locales with placeholder values
 *
 * Usage:
 *   node scripts/audit-translations.mjs
 *   node scripts/audit-translations.mjs --fix
 */

import fs from 'fs/promises';
import fssync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const COLOR = {
  r: s => `\x1b[31m${s}\x1b[0m`,
  y: s => `\x1b[33m${s}\x1b[0m`,
  g: s => `\x1b[32m${s}\x1b[0m`,
  c: s => `\x1b[36m${s}\x1b[0m`,
  b: s => `\x1b[34m${s}\x1b[0m`,
};

const argv = new Set(process.argv.slice(2));
const DO_FIX = argv.has('--fix');

// ---------- Helpers ----------
const exists = async p => fssync.existsSync(p);

const readText = async p => (await fs.readFile(p, 'utf8')).toString();

const walk = async (dir, acc = []) => {
  let entries = [];
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return acc; }

  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', '.next', 'dist', '.git', 'coverage'].includes(e.name)) continue;
      await walk(full, acc);
    } else if (e.isFile()) {
      if (/\.(tsx?|jsx?)$/i.test(e.name)) acc.push(full);
    }
  }
  return acc;
};

// Extract a JS object body starting at a key like "ar:" or "en:"
function extractLocaleObject(source, localeKey) {
  const keyIdx = source.indexOf(`${localeKey}:`);
  if (keyIdx === -1) return null;

  // Find first '{' after "<localeKey>:"
  const braceStart = source.indexOf('{', keyIdx);
  if (braceStart === -1) return null;

  // Brace matching to find the block end (nested-safe)
  let depth = 0;
  for (let i = braceStart; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        const raw = source.slice(braceStart, i + 1);
        return raw;
      }
    }
  }
  return null;
}

// Convert TS-ish object literal to a key set by extracting key names only
function objectLiteralToKeySet(objLiteral) {
  const keys = new Set();
  
  // Remove comments first
  let s = objLiteral.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  
  // Split into lines and extract keys line by line to avoid multi-line matches
  const lines = s.split('\n');
  
  for (const line of lines) {
    // Match quoted keys followed by colon: 'key': or "key":
    // Single quotes
    const singleQuoteMatch = /'([^']+)'\s*:/.exec(line);
    if (singleQuoteMatch) {
      const key = singleQuoteMatch[1];
      // Skip keys ending with backslash (parse artifacts)
      if (!key.endsWith('\\')) {
        keys.add(key);
      }
    }
    
    // Double quotes
    const doubleQuoteMatch = /"([^"]+)"\s*:/.exec(line);
    if (doubleQuoteMatch) {
      const key = doubleQuoteMatch[1];
      // Skip keys ending with backslash (parse artifacts)
      if (!key.endsWith('\\')) {
        keys.add(key);
      }
    }
  }
  
  return keys;
}

// Helper to flatten nested JSON keys
function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// Parse i18n JSON files for ar/en keys
async function loadCatalogKeys(ctxPath) {
  const arKeys = new Set();
  const enKeys = new Set();
  const errors = [];
  let hasPrimaryCatalog = false;

  // Check for i18n JSON files first (actual project structure)
  const enJsonPath = path.join(ROOT, 'i18n', 'en.json');
  const arJsonPath = path.join(ROOT, 'i18n', 'ar.json');
  
  if (await exists(enJsonPath) && await exists(arJsonPath)) {
    try {
      const enContent = await readText(enJsonPath);
      const arContent = await readText(arJsonPath);
      const enData = JSON.parse(enContent);
      const arData = JSON.parse(arContent);
      
      flattenKeys(enData).forEach(key => enKeys.add(key));
      flattenKeys(arData).forEach(key => arKeys.add(key));
      hasPrimaryCatalog = true;
    } catch (err) {
      errors.push(`Failed to parse i18n JSON files: ${err.message}`);
    }
  }
  
  // Fallback to TS-based approach if JSON files not found
  if (!hasPrimaryCatalog) {
    const generatedPath = path.join(ROOT, 'i18n', 'new-translations.ts');
    if (await exists(generatedPath)) {
      try {
        const source = await readText(generatedPath);
        const arBlock = extractLocaleObject(source, 'ar');
        const enBlock = extractLocaleObject(source, 'en');
        if (arBlock && enBlock) {
          objectLiteralToKeySet(arBlock).forEach(key => arKeys.add(key));
          objectLiteralToKeySet(enBlock).forEach(key => enKeys.add(key));
          hasPrimaryCatalog = true;
        } else {
          errors.push('Could not parse ar/en blocks in i18n/new-translations.ts');
        }
      } catch (err) {
        errors.push(`Failed to parse i18n/new-translations.ts: ${err.message}`);
      }
    } else {
      errors.push('Translation catalog not found at i18n/new-translations.ts');
    }

    if (!hasPrimaryCatalog && await exists(ctxPath)) {
      const source = await readText(ctxPath);
      const arBlock = extractLocaleObject(source, 'ar');
      const enBlock = extractLocaleObject(source, 'en');
      if (!arBlock || !enBlock) {
        errors.push('Could not locate ar/en blocks in TranslationContext.tsx');
      } else {
        objectLiteralToKeySet(arBlock).forEach(key => arKeys.add(key));
        objectLiteralToKeySet(enBlock).forEach(key => enKeys.add(key));
        hasPrimaryCatalog = true;
      }
    }
  }

  return { ar: arKeys, en: enKeys, errors };
}

// Find i18n keys used in code
function findUsedKeys(fileContent, filePath, used, fileMap) {
  const relativePath = path.relative(ROOT, filePath).replace(/\\/g, '/');
  const normalizedPath = relativePath ? path.posix.join('Fixzit', relativePath) : 'Fixzit';
  const appendFile = (key) => {
    if (!fileMap[key]) fileMap[key] = [];
    if (!fileMap[key].includes(normalizedPath)) {
      fileMap[key].push(normalizedPath);
    }
  };
  // t('key') / t("key")
  const tCall = /\bt\s*\(\s*(['"])([^'"]+)\1/g;
  // t(`literal`) — unsafe dynamic
  const tTpl = /\bt\s*\(\s*`/g;
  // ns in options: t('key', { ns: 'common' })
  const nsOpt = /\bt\s*\(\s*(['"])([^'"]+)\1\s*,\s*\{[^}]*\bns\s*:\s*(['"])([^'"]+)\3/g;
  // <Trans i18nKey="...">
  const transTag = /<Trans[^>]*\bi18nKey\s*=\s*(['"])([^'"]+)\1/g;

  // 1) direct t('key')
  for (const m of fileContent.matchAll(tCall)) {
    const key = m[2];
    used.add(key);
    appendFile(key);
  }
  // 2) ns option
  for (const m of fileContent.matchAll(nsOpt)) {
    const key = m[2];
    const ns = m[4];
    const fullKey = `${ns}:${key}`;
    used.add(fullKey);
    appendFile(fullKey);
  }
  // 3) <Trans i18nKey="...">
  for (const m of fileContent.matchAll(transTag)) {
    const key = m[2];
    used.add(key);
    appendFile(key);
  }
  // 4) template literal calls — flag as dynamic
  if (tTpl.test(fileContent)) {
    used.add('UNSAFE_DYNAMIC');
    appendFile('UNSAFE_DYNAMIC');
  }
}

// Expand namespaces: if we see "common:save" and catalogs are flat
function stripNamespace(key) {
  const i = key.indexOf(':');
  return i > -1 ? key.slice(i + 1) : key;
}

async function main() {
  console.log(COLOR.b('╔════════════════════════════════════════════════════════════════╗'));
  console.log(COLOR.b('║            FIXZIT – COMPREHENSIVE TRANSLATION AUDIT           ║'));
  console.log(COLOR.b('╚════════════════════════════════════════════════════════════════╝\n'));

  const ctxPath = path.join(ROOT, 'contexts', 'TranslationContext.tsx');
  if (!(await exists(ctxPath))) {
    console.error(COLOR.r(`Translation context not found at ${ctxPath}`));
    process.exit(2);
  }

  // Load catalogs
  const { ar, en, errors } = await loadCatalogKeys(ctxPath);
  if (errors.length) errors.forEach(e => console.error(COLOR.r(`Parser warning: ${e}`)));
  console.log(COLOR.c('📦 Catalog stats'));
  console.log('  EN keys:', en.size);
  console.log('  AR keys:', ar.size);
  console.log('  Gap    :', Math.abs(en.size - ar.size));

  // Scan codebase
  console.log('\n' + COLOR.c('🔍 Scanning codebase for translation usage...'));
  const roots = ['app', 'components', 'contexts', 'hooks', 'modules', 'pages', 'src']
    .map(p => path.join(ROOT, p))
    .filter(p => fssync.existsSync(p));
  const files = (await Promise.all(roots.map(r => walk(r)))).flat();

  const used = new Set();
  const fileMap = {}; // key -> [files using it]
  for (const f of files) {
    try {
      const content = await fs.readFile(f, 'utf8');
      findUsedKeys(content, f, used, fileMap);
    } catch { /* skip */ }
  }

  // Derive sets
  const usedList = [...used];
  const hasDynamic = used.has('UNSAFE_DYNAMIC');
  const usedFiltered = usedList.filter(k => k !== 'UNSAFE_DYNAMIC');

  const enSet = en;
  const arSet = ar;

  // Normalize (strip namespace for catalog lookup)
  const missingInAr = [];
  const missingInEn = [];
  for (const key of enSet) if (!arSet.has(key)) missingInAr.push(key);
  for (const key of arSet) if (!enSet.has(key)) missingInEn.push(key);

  const missingUsed = [];
  const missingDetail = [];
  for (const k of usedFiltered) {
    const bare = stripNamespace(k);
    const inEN = enSet.has(bare);
    const inAR = arSet.has(bare);
    if (!inEN || !inAR) {
      missingUsed.push(k);
      missingDetail.push({ key: k, bare, inEN, inAR, files: fileMap[k] || [] });
    }
  }

  // Report
  console.log('\n' + COLOR.c('📊 Summary'));
  console.log('  Files scanned:', files.length);
  console.log('  Keys used    :', usedFiltered.length, hasDynamic ? COLOR.y('(+ dynamic template usages)') : '');
  console.log('  Missing (catalog parity):', missingInAr.length + missingInEn.length);
  console.log('  Missing (used in code)  :', missingDetail.length);

  if (missingInAr.length) {
    console.log('\n' + COLOR.r(`❌ Missing in Arabic (${missingInAr.length})`));
    missingInAr.forEach(k => console.log('  -', k));
  }
  if (missingInEn.length) {
    console.log('\n' + COLOR.r(`❌ Missing in English (${missingInEn.length})`));
    missingInEn.forEach(k => console.log('  -', k));
  }
  if (missingDetail.length) {
    console.log('\n' + COLOR.r('❌ CRITICAL: Keys used in code but missing in catalogs'));
    missingDetail.forEach(({ key, inEN, inAR, files }) => {
      console.log(`  - ${key}  (EN: ${inEN ? '✅' : '❌'}  AR: ${inAR ? '✅' : '❌'})`);
      console.log(`    Used in: ${files.slice(0, 3).join(', ')}${files.length > 3 ? ` ... and ${files.length - 3} more` : ''}`);
    });
  }
  if (hasDynamic) {
    console.log('\n' + COLOR.y('⚠️  UNSAFE_DYNAMIC: Found template-literal t(`...`) usages which cannot be statically audited.'));
    console.log('    Files:', fileMap['UNSAFE_DYNAMIC'].slice(0, 5).join(', '));
  }

  // Artifacts
  const jsonOut = {
    stats: {
      files: files.length,
      usedKeys: usedFiltered.length,
      hasDynamic,
      enCount: en.size,
      arCount: ar.size,
      parityGap: Math.abs(en.size - ar.size),
    },
    missing: {
      inAr: missingInAr,
      inEn: missingInEn,
      used: missingDetail.map(m => ({
        key: m.key,
        bare: m.bare,
        inEN: m.inEN,
        inAR: m.inAR,
        files: m.files,
      })),
    },
    fileMap,
    timestamp: new Date().toISOString(),
  };
  const CSV = [
    'type,key,bare,inEN,inAR,files',
    ...missingInAr.map(k => `CATALOG_MISSING_AR,${k},${k},${enSet.has(k)},false,""`),
    ...missingInEn.map(k => `CATALOG_MISSING_EN,${k},${k},false,${arSet.has(k)},""`),
    ...missingDetail.map(m => `USED_MISSING,${m.key},${m.bare},${m.inEN},${m.inAR},"${m.files.join('; ')}"`),
  ].join('\n');

  const docsPath = path.join(ROOT, 'docs', 'translations');
  await fs.mkdir(docsPath, { recursive: true });
  await fs.writeFile(path.join(docsPath, 'translation-audit.json'), JSON.stringify(jsonOut, null, 2));
  await fs.writeFile(path.join(docsPath, 'translation-audit.csv'), CSV);
  console.log('\n' + COLOR.g('✅ Artifacts written:'));
  console.log('  - docs/translations/translation-audit.json');
  console.log('  - docs/translations/translation-audit.csv');

  // Detect JSON catalogs (canonical source) vs TS fallback
  const hasJsonCatalog =
    (await exists(path.join(ROOT, 'i18n', 'en.json'))) &&
    (await exists(path.join(ROOT, 'i18n', 'ar.json')));

  // Optional autofix (only for TS-based catalogs – JSON catalogs must be edited directly)
  if (DO_FIX && !hasJsonCatalog && (missingInAr.length || missingInEn.length || missingDetail.length)) {
    console.log('\n' + COLOR.b('🛠  --fix enabled: applying missing keys to TranslationContext.tsx ...'));
    let ctx = await readText(ctxPath);

    const needAdd = new Set([
      ...missingInAr,
      ...missingInEn,
      ...missingDetail.map(m => m.bare),
    ]);

    // Convert to array and add placeholders
    const bareList = [...needAdd].map(stripNamespace);
    
    // Find insertion points for both locales
    const arInsertPoint = ctx.lastIndexOf('}', ctx.indexOf('en:'));
    const _enInsertPoint = ctx.lastIndexOf('}');

    if (arInsertPoint > -1 && bareList.length) {
      const arInsertions = bareList
        .filter(k => !arSet.has(k))
        .map(k => `    '${k}': '${k}',`)
        .join('\n');
      
      if (arInsertions) {
        ctx = ctx.slice(0, arInsertPoint) + '\n' + arInsertions + '\n  ' + ctx.slice(arInsertPoint);
      }
    }

    // Re-read to get updated positions
    const enInsertPointUpdated = ctx.lastIndexOf('}');
    if (enInsertPointUpdated > -1 && bareList.length) {
      const enInsertions = bareList
        .filter(k => !enSet.has(k))
        .map(k => `    '${k}': '${k}',`)
        .join('\n');
      
      if (enInsertions) {
        ctx = ctx.slice(0, enInsertPointUpdated) + '\n' + enInsertions + '\n  ' + ctx.slice(enInsertPointUpdated);
      }
    }

    await fs.writeFile(ctxPath, ctx, 'utf8');
    console.log(COLOR.g('✔ Catalog updated with placeholder values for missing keys (EN/AR).'));
  } else if (DO_FIX && hasJsonCatalog) {
    console.log('\n' + COLOR.y('⚠️  --fix skipped: JSON catalogs detected. Please edit i18n/en.json and i18n/ar.json directly.'));
  }

  // STRICT v4 / Governance: non-zero exit if any gap (dynamic is warning only)
  const hasAnyGap = missingInAr.length || missingInEn.length || missingDetail.length;
  console.log('\n' + COLOR.b('╔════════════════════════════════════════════════════════════════╗'));
  console.log(COLOR.b('║                        FINAL SUMMARY                            ║'));
  console.log(COLOR.b('╚════════════════════════════════════════════════════════════════╝'));
  console.log('Catalog Parity :', missingInAr.length === 0 && missingInEn.length === 0 ? COLOR.g('✅ OK') : COLOR.r('❌ GAP'));
  console.log('Code Coverage  :', missingDetail.length === 0 ? COLOR.g('✅ All used keys present') : COLOR.r('❌ Missing used keys'));
  if (hasDynamic) console.log('Dynamic Keys   :', COLOR.y('⚠️ Present (template literals)'));

  // Exit status for CI - dynamic keys are warnings, not failures
  process.exit(hasAnyGap ? 1 : 0);
}

main().catch(err => {
  console.error(COLOR.r('Fatal error in audit script:\n'), err);
  process.exit(2);
});

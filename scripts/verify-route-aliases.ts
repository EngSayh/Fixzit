#!/usr/bin/env tsx
/**
 * verify-route-aliases.ts
 *
 * Scans the /app/fm directory for alias pages (exporting from another route)
 * and ensures that the referenced target file actually exists on disk.
 * Emits a JSON + human summary so CI can fail fast when an alias target is missing.
 */

import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const FM_DIR = path.join(ROOT, 'app', 'fm');
const VALID_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

interface AliasResult {
  alias: string;
  target: string;
  exists: boolean;
}

function walkPages(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const pages: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      pages.push(...walkPages(fullPath));
    } else if (entry.isFile() && entry.name === 'page.tsx') {
      pages.push(fullPath);
    }
  }
  return pages;
}

function normalizeTarget(importPath: string, fileDir: string): string[] {
  if (importPath.startsWith('@/')) {
    const withoutAlias = importPath.replace(/^@\//, '');
    return VALID_EXTENSIONS.map((ext) => path.join(ROOT, withoutAlias + ext));
  }
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    return VALID_EXTENSIONS.map((ext) => path.join(fileDir, importPath + ext));
  }
  return [];
}

function analyzeAlias(file: string): AliasResult | null {
  const content = readFileSync(file, 'utf8');
  const match = content.match(/export \{ default \} from '([^']+)'/);
  if (!match) return null;
  const importPath = match[1];
  const candidates = normalizeTarget(importPath, path.dirname(file));
  const existing = candidates.find((candidate) => {
    try {
      return statSync(candidate).isFile();
    } catch {
      return false;
    }
  });
  return {
    alias: path.relative(ROOT, file),
    target: existing ? path.relative(ROOT, existing) : candidates[0] ?? importPath,
    exists: Boolean(existing),
  };
}

const aliasFiles = walkPages(FM_DIR);
const results: AliasResult[] = [];
for (const file of aliasFiles) {
  const result = analyzeAlias(file);
  if (result) results.push(result);
}

const missing = results.filter((result) => !result.exists);

if (missing.length === 0) {
  console.log(`✅ Route alias verification passed. Checked ${results.length} aliases.`);
} else {
  console.error(`❌ Route alias verification failed. ${missing.length} alias(es) reference missing targets:`);
  for (const miss of missing) {
    console.error(` - ${miss.alias} -> ${miss.target}`);
  }
  process.exitCode = 1;
}

const reportPath = path.join(ROOT, '_artifacts', 'route-alias-report.json');
try {
  mkdirSync(path.dirname(reportPath), { recursive: true });
  writeFileSync(
    reportPath,
    JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2)
  );
  console.log(`📝 Detailed report written to ${path.relative(ROOT, reportPath)}`);
} catch (err) {
  console.warn('⚠️  Unable to write route alias report:', err);
}

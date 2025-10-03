#!/usr/bin/env node
/**
 * Consolidate Script - Scan & Apply (No Deletes; Archive)
 * Detects duplicates by hash and consolidates to canonical files
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const ARCHIVE = path.join(ROOT, '__archive', new Date().toISOString().slice(0,10));
const MAP_FILE = path.join(ROOT, 'GOVERNANCE/CONSOLIDATION_MAP.json');

const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.md', '.json']);

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (p.includes('__archive') || p.includes('__legacy') || p.includes('node_modules') || p.startsWith('.next')) continue;
      yield* walk(p);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (exts.has(ext)) yield p;
    }
  }
}

function hashFile(p) {
  const buf = fs.readFileSync(p);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function ensureDir(p) { await fsp.mkdir(p, { recursive: true }); }

async function main() {
  const mode = process.argv.includes('--apply') ? 'apply' : 'scan';
  const seen = new Map(); // hash -> list of files
  
  console.log(`Scanning files in ${ROOT}...`);
  for (const p of walk(ROOT)) {
    const h = hashFile(p);
    const arr = seen.get(h) || [];
    arr.push(p);
    seen.set(h, arr);
  }

  const groups = [...seen.values()].filter(list => list.length > 1);
  const map = [];
  
  for (const files of groups) {
    // choose canonical: prefer TypeScript + longest file path depth (heuristic for primary)
    const sorted = [...files].sort((a, b) => {
      const score = f => (f.endsWith('.tsx') || f.endsWith('.ts') ? 2 : 1) + f.split(path.sep).length * 0.01;
      return score(b) - score(a);
    });
    const canonical = sorted[0];
    const dups = sorted.slice(1);
    
    map.push({ 
      canonical, 
      duplicates: dups,
      reason: 'Selected by: TypeScript preference + path depth'
    });
    
    if (mode === 'apply') {
      await ensureDir(ARCHIVE);
      for (const d of dups) {
        const rel = path.relative(ROOT, d);
        const dest = path.join(ARCHIVE, rel);
        await ensureDir(path.dirname(dest));
        console.log(`Archiving: ${rel} → __archive/`);
        await fsp.rename(d, dest); // archive, don't delete
      }
    }
  }

  await ensureDir(path.dirname(MAP_FILE));
  fs.writeFileSync(MAP_FILE, JSON.stringify({
    generatedAt: new Date().toISOString(),
    mode,
    totalDuplicateGroups: groups.length,
    decisions: map
  }, null, 2));
  
  console.log(`${mode.toUpperCase()}: duplicate groups=${groups.length}, map=${MAP_FILE}`);
}

main().catch(e => { console.error(e); process.exit(1); });

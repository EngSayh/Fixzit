#!/usr/bin/env node
/**
 * Fixzit Repo Portability Guard
 * - Detects Windows-incompatible filenames, path-length risks, and case-collisions
 *
 * Usage:
 *   node scripts/check-repo-portability.mjs
 *   node scripts/check-repo-portability.mjs --maxPathLen=180 --maxSegmentLen=60
 */
import fs from "node:fs/promises";
import path from "node:path";

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.split("=", 2);
  return [k.replace(/^--/, ""), v ?? "true"];
}));

const MAX_PATH_LEN = Number(args.maxPathLen ?? 180);
const MAX_SEG_LEN  = Number(args.maxSegmentLen ?? 60);

const IGNORE_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "out",
  "coverage",
  ".turbo",
  ".vercel",
  ".cache",
  ".pnpm-store",
]);

// eslint-disable-next-line no-control-regex -- Intentional: detecting Windows-invalid control chars
const WINDOWS_INVALID_CHARS = /[<>:"\\|?*\u0000-\u001F]/; // NOTE: "/" handled by path splitting
const WINDOWS_RESERVED = new Set([
  "CON","PRN","AUX","NUL","CLOCK$",
  "COM1","COM2","COM3","COM4","COM5","COM6","COM7","COM8","COM9",
  "LPT1","LPT2","LPT3","LPT4","LPT5","LPT6","LPT7","LPT8","LPT9",
]);

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function isReservedWindowsName(segment) {
  const base = segment.split(".")[0]; // "con.txt" -> "con"
  return WINDOWS_RESERVED.has(base.toUpperCase());
}

function hasTrailingDotOrSpace(segment) {
  return /[. ]$/.test(segment);
}

function isAscii(s) {
  // eslint-disable-next-line no-control-regex -- Intentional: checking for ASCII range
  return /^[\x00-\x7F]*$/.test(s);
}

async function walk(dir, relBase = "") {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results = [];
  for (const ent of entries) {
    const rel = relBase ? path.join(relBase, ent.name) : ent.name;
    const abs = path.join(dir, ent.name);

    if (ent.isDirectory()) {
      if (IGNORE_DIRS.has(ent.name)) continue;
      results.push(...await walk(abs, rel));
    } else if (ent.isFile()) {
      results.push(rel);
    }
  }
  return results;
}

async function main() {
  const cwd = process.cwd();
  const files = await walk(cwd);

  const errors = [];
  const warnings = [];

  // Case-collision detection map
  const lowerMap = new Map(); // lowercased path -> original path(s)

  for (const relNative of files) {
    const rel = toPosix(relNative);
    const segments = rel.split("/");

    // 1) Relative path length
    if (rel.length > MAX_PATH_LEN) {
      errors.push(`[PATH_LEN] ${rel.length} > ${MAX_PATH_LEN}: ${rel}`);
    }

    // 2) Segment checks
    for (const seg of segments) {
      if (!seg) continue;

      if (seg.length > MAX_SEG_LEN) {
        errors.push(`[SEG_LEN] ${seg.length} > ${MAX_SEG_LEN}: ${rel}`);
        break;
      }

      if (WINDOWS_INVALID_CHARS.test(seg)) {
        errors.push(`[WIN_CHARS] Invalid Windows chars in segment "${seg}": ${rel}`);
        break;
      }

      if (hasTrailingDotOrSpace(seg)) {
        errors.push(`[TRAILING_DOT_SPACE] Segment ends with dot/space "${seg}": ${rel}`);
        break;
      }

      if (isReservedWindowsName(seg)) {
        errors.push(`[WIN_RESERVED] Reserved Windows name "${seg}": ${rel}`);
        break;
      }

      if (!isAscii(seg)) {
        warnings.push(`[NON_ASCII] Segment contains non-ASCII chars "${seg}": ${rel}`);
      }

      if (/\s/.test(seg)) {
        warnings.push(`[WHITESPACE] Segment contains whitespace "${seg}": ${rel}`);
      }
    }

    // 3) Case-collision detection (repo-relative)
    const _lower = rel.toLowerCase();
    if (!lowerMap.has(_lower)) lowerMap.set(_lower, []);
    lowerMap.get(_lower).push(rel);
  }

  for (const [_lower, originals] of lowerMap.entries()) {
    const uniq = [...new Set(originals)];
    if (uniq.length > 1) {
      errors.push(`[CASE_COLLISION] These paths collide on case-insensitive FS:\n  - ${uniq.join("\n  - ")}`);
    }
  }

  // Output
  console.log("=== Fixzit Repo Portability Guard ===");
  console.log(`Scanned files: ${files.length}`);
  console.log(`Max path len: ${MAX_PATH_LEN}, Max segment len: ${MAX_SEG_LEN}\n`);

  if (warnings.length) {
    console.log(`WARNINGS (${warnings.length})`);
    for (const w of warnings) console.log(`- ${w}`);
    console.log("");
  }

  if (errors.length) {
    console.log(`ERRORS (${errors.length})`);
    for (const e of errors) console.log(`- ${e}`);
    console.log("\nFAIL");
    process.exit(1);
  }

  console.log("PASS");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(2);
});

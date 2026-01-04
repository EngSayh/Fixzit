#!/usr/bin/env node
/**
 * Fail the pipeline on NEW, un-waived issues.
 * Inputs:
 *  - reports/api-endpoint-scan-v2.json (or api-endpoint-scan.json fallback)
 *  - reports/i18n-missing-v2.json (or i18n-missing.json fallback)
 *  - .fixzit-waivers.json
 *  - Repo scan for console.log/dir (warn/error allowed if waived)
 *  - Duplicate/name-collision check excluding vendor/temp dirs (fast)
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";

const ROOT = process.cwd();
const WAIVERS = readJsonSafe(".fixzit-waivers.json", {});
const REPORTS_DIR = path.join(ROOT, "reports");

const apiReport = readJsonSafe(
  path.join(REPORTS_DIR, "api-endpoint-scan-v2.json"),
  readJsonSafe(path.join(REPORTS_DIR, "api-endpoint-scan.json"), []),
);
const i18nReport = readJsonSafe(
  path.join(REPORTS_DIR, "i18n-missing-v2.json"),
  readJsonSafe(path.join(REPORTS_DIR, "i18n-missing.json"), {}),
);

const IGNORE_DIRS = new Set(
  [
    "node_modules",
    ".next",
    "dist",
    "build",
    "coverage",
    ".git",
    ".turbo",
    ".vercel",
    ".tmp",
    "tmp",
    ...(WAIVERS?.duplicates?.ignore_dirs || []),
  ].map((s) => s.replace(/\/+$/, "").toLowerCase()),
);

function readJsonSafe(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
}

function* walk(dir) {
  const ents = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of ents) {
    const full = path.join(dir, e.name);
    const rel = path.relative(ROOT, full);
    const head = rel.split(path.sep)[0].toLowerCase();
    if (IGNORE_DIRS.has(head)) continue;
    if (e.isDirectory()) yield* walk(full);
    else yield full;
  }
}

function hashFile(file) {
  const h = crypto.createHash("sha1");
  h.update(fs.readFileSync(file));
  return h.digest("hex");
}

let failures = [];

// 1) API routes: no missing methods after factory/NextAuth logic
{
  const missing = apiReport.filter(
    (r) =>
      r.status === "NO_METHODS_DETECTED" ||
      (Array.isArray(r.methods) && r.methods.length === 0),
  );
  if (missing.length)
    failures.push(
      `API routes missing methods: ${missing.length}\n  - ` +
        missing
          .slice(0, 20)
          .map((m) => m.file)
          .join("\n  - "),
    );
}

// 2) i18n: ensure parity and no production missing (ignore known test fixture keys)
{
  const missing = new Set(i18nReport.usedButMissing || []);
  const ignore = new Set([
    "a",
    "bool",
    "hello",
    "missing.key",
    "msg",
    "nested.deep.value",
    "num",
    "obj",
    "watch-all",
    "welcome",
  ]);
  for (const k of ignore) missing.delete(k);
  const gap = i18nReport.parity?.gap ?? 0;
  if (gap > 0) failures.push(`i18n parity gap detected: ${gap}`);
  if (missing.size > 0)
    failures.push(
      `i18n used-but-missing keys: ${missing.size} (excluding test fixtures)`,
    );
}

// 3) Console usage (flag console.log/dir only if policy is active - frontend only)
{
  if (WAIVERS?.console?.flag_log_and_dir_only) {
    const rx = /\bconsole\.(log|dir)\s*\(/;
    const offenders = [];
    const skipDirs = new Set([
      "scripts",
      "qa",
      "public",
      "tests",
      "test",
      "__tests__",
      "e2e",
      "tools",
      "jobs",
      "server",
      "lib",
      "issue-tracker",  // CLI tool, not frontend
    ]);
    const skipFiles = new Set(["setup.js", "vitest.setup.ts", "jest.setup.ts"]);
    for (const file of walk(ROOT)) {
      if (!/\.(ts|tsx|js|jsx)$/.test(file)) continue;
      const rel = path.relative(ROOT, file);
      const head = rel.split(path.sep)[0].toLowerCase();
      const fileName = path.basename(rel).toLowerCase();
      if (skipDirs.has(head) || skipFiles.has(fileName)) continue; // Focus on frontend app/components only
      const txt = fs.readFileSync(file, "utf8");
      // Skip if file has eslint-disable comment for no-console (intentional debugging)
      if (/eslint-disable[^*]*no-console/.test(txt)) continue;
      if (rx.test(txt)) offenders.push(rel);
      if (offenders.length > 200) break;
    }
    if (offenders.length)
      failures.push(
        `console.log/dir found in ${offenders.length} frontend app/component files:\n  - ` +
          offenders.slice(0, 30).join("\n  - "),
      );
  }
}

// 4) Duplicate by content (fast hash), excluding vendor/temp - focus on app/components
{
  const hashMap = new Map(); // sha1 -> [relPaths]
  const primaryDirs = new Set([
    "app",
    "components",
    "lib",
    "modules",
    "services",
  ]);
  // Files that are intentionally duplicated per route segment (Next.js convention)
  const allowedDuplicates = new Set(["error.tsx", "loading.tsx", "not-found.tsx"]);
  for (const abs of walk(ROOT)) {
    const rel = path.relative(ROOT, abs);
    const head = rel.split(path.sep)[0].toLowerCase();
    if (!primaryDirs.has(head)) continue; // Only check primary app directories
    // Skip intentionally duplicated Next.js route segment files
    const fileName = path.basename(rel);
    if (allowedDuplicates.has(fileName)) continue;
    // Only hash medium-sized text files quickly; skip >2MB to avoid noise
    try {
      const stat = fs.statSync(abs);
      if (stat.size <= 2_000_000 && /\.(ts|tsx|js|jsx)$/.test(abs)) {
        const sha = hashFile(abs);
        hashMap.set(sha, (hashMap.get(sha) || []).concat(rel));
      }
    } catch {}
  }
  const dupByHash = [...hashMap.values()].filter((arr) => arr.length > 1);
  // Content duplicates are rarely acceptable in app code; warn hard
  if (dupByHash.length > 0) {
    const count = dupByHash.reduce((n, arr) => n + (arr.length - 1), 0);
    const sample = dupByHash
      .slice(0, 5)
      .map((arr) => `\n    [${arr.length} copies]: ${arr.join(", ")}`)
      .join("");
    failures.push(
      `Content duplicates in app/components/lib: ${count} files across ${dupByHash.length} groups${sample}`,
    );
  }
}

if (failures.length) {
  console.error("⛔ Regression checks failed:\n- " + failures.join("\n- "));
  process.exit(1);
} else {
  console.log("✅ Regression checks passed.");
}

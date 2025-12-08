#!/usr/bin/env node
/**
 * Fails on weak hardcoded passwords (password123/admin123/Test@1234).
 * Scans source files (js/ts/tsx/json/md/yml/ps1) excluding common build/output dirs.
 */

const fs = require("node:fs");
const path = require("node:path");
const fg = require("fast-glob");

const ROOT = process.cwd();
const WEAK_PATTERN = /(password123|admin123|Test@1234)/gi;
const EXT_GLOB = "**/*.{js,ts,tsx,jsx,json,yml,yaml,mjs,ps1}";
const IGNORE = [
  "**/node_modules/**",
  "**/.next/**",
  "**/playwright-report/**",
  "**/tests/playwright-report/**",
  "**/_artifacts/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/out/**",
  "**/.turbo/**",
  "**/coverage/**",
  "**/docs/**",
  "**/tests/**",
  "**/qa/**",
  "scripts/check-weak-passwords.js",
  "scripts/check-seed-guards.js",
  "scripts/testing/**",
];

async function main() {
  const files = await fg(EXT_GLOB, {
    cwd: ROOT,
    ignore: IGNORE,
    dot: false,
  });

  const failures = [];

  for (const rel of files) {
    const base = path.basename(rel);
    if (rel.startsWith("scripts/")) {
      const isSeed = base.startsWith("seed");
      const isSuperadminFix = base === "fix-superadmin-password.js";
      if (!isSeed && !isSuperadminFix) {
        continue;
      }
    }
    const abs = path.join(ROOT, rel);
    const stat = fs.statSync(abs);
    if (stat.size > 2 * 1024 * 1024) continue; // skip huge files
    const text = fs.readFileSync(abs, "utf8");
    const matches = [...text.matchAll(WEAK_PATTERN)].map((m) => m[0]);
    if (matches.length > 0) {
      failures.push(`${rel} -> ${Array.from(new Set(matches)).join(", ")}`);
    }
  }

  if (failures.length > 0) {
    console.error("❌ Weak password literals found:");
    failures.forEach((f) => console.error(` - ${f}`));
    process.exit(1);
  }

  console.log("✅ No weak password literals found.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

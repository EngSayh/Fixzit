#!/usr/bin/env node
/**
 * Guardrail: ensure all seed scripts block prod/CI and require ALLOW_SEED=1.
 *
 * Scans scripts/** for files beginning with "seed" (js/ts/mjs/ps1) and fails
 * if either guard is missing.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const EXTENSIONS = new Set([".js", ".ts", ".mjs", ".ps1"]);
const targets = [];
const failures = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (entry.name.startsWith("seed") && EXTENSIONS.has(ext)) {
        targets.push(fullPath);
      }
    }
  }
}

walk(path.join(ROOT, "scripts"));

for (const file of targets) {
  const content = fs.readFileSync(file, "utf8");
  const hasAllowSeed =
    content.includes("ALLOW_SEED") || /\$env:ALLOW_SEED/i.test(content);
  const hasProdGuard =
    /NODE_ENV\s*===\s*['"]production['"]/.test(content) ||
    /process\.env\.CI\s*===\s*['"]true['"]/.test(content) ||
    /\$env:NODE_ENV\s*-eq\s*"production"/i.test(content) ||
    /\$env:CI\s*-eq\s*"true"/i.test(content);

  const reasons = [];
  if (!hasAllowSeed) reasons.push("missing ALLOW_SEED guard");
  if (!hasProdGuard) reasons.push("missing production/CI guard");

  if (reasons.length > 0) {
    failures.push(`${path.relative(ROOT, file)} -> ${reasons.join(", ")}`);
  }
}

if (failures.length > 0) {
  console.error("❌ Seed guard check failed:");
  failures.forEach((f) => console.error(` - ${f}`));
  process.exit(1);
}

console.log("✅ All seed scripts enforce prod/CI + ALLOW_SEED guards.");

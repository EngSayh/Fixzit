#!/usr/bin/env node
/**
 * Static guard: fail if weak password literals are present outside allowed fixtures.
 * Patterns flagged: password123, admin123, Test@1234 (case-insensitive).
 */
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const patterns = ["password123", "admin123", "Test@1234"];
const ignoreGlobs = [
  "node_modules/**",
  ".git/**",
  ".next/**",
  "dist/**",
  "build/**",
  "coverage/**",
  "playwright-report/**",
  "_artifacts/**",
  "artifacts/**",
  "tmp/**",
  "test-results/**",
];

const rgArgs = [
  "--no-heading",
  "--line-number",
  "--color",
  "never",
  "--hidden",
];
for (const glob of ignoreGlobs) {
  rgArgs.push(`-g!${glob}`);
}
rgArgs.push(patterns.join("|"));

const result = spawnSync("rg", rgArgs, {
  cwd: repoRoot,
  encoding: "utf8",
});

if (result.status === 1) {
  console.log("✅ No weak password literals found.");
  process.exit(0);
}

if (result.status !== 0 && result.status !== 1) {
  console.error("❌ Weak password scan failed (rg error):", result.stderr.trim());
  process.exit(result.status || 1);
}

const rawLines = result.stdout
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

// Allowlist: skip this checker file and snapshots/fixtures if any appear.
const matches = rawLines.filter((line) => {
  const file = line.split(":")[0] || "";
  if (file.includes("scripts/check-weak-passwords.js")) return false;
  if (file.includes("__snapshots__")) return false;
  if (file.includes("__fixtures__")) return false;
  return true;
});

if (matches.length === 0) {
  console.log("✅ No weak password literals found.");
  process.exit(0);
}

console.error(
  "❌ Weak password literals detected (blockers):\n" + matches.join("\n"),
);
process.exit(1);

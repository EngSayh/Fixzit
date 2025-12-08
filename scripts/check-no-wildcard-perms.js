#!/usr/bin/env node
/**
 * Prevent regression: disallow permissions:['*'] in tests/seeds.
 */
const fg = require("fast-glob");
const fs = require("node:fs");

const PATTERN = /permissions\s*:\s*\[\s*['"]\*\s*['"]\s*\]/;
const globs = ["tests/**/*.{ts,js,tsx}", "scripts/**/*.{ts,js,tsx}"];

const offenders = [];

for (const file of fg.sync(globs, { dot: false })) {
  if (file.includes("check-no-wildcard-perms")) continue;
  const content = fs.readFileSync(file, "utf8");

  let inBlock = false;
  const lines = content.split(/\r?\n/);
  const hasWildcard = lines.some((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("/*")) inBlock = true;
    if (inBlock) {
      if (trimmed.includes("*/")) inBlock = false;
      return false;
    }
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) return false;
    return PATTERN.test(line);
  });

  if (hasWildcard) {
    offenders.push(file);
  }
}

if (offenders.length) {
  console.error("❌ Found wildcard permissions in tests/seeds:");
  offenders.forEach((f) => console.error(` - ${f}`));
  process.exit(1);
}

console.log("✅ No wildcard permissions detected in tests/seeds.");

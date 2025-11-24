#!/usr/bin/env node
/**
 * Placeholder scan - detects CHANGEME, TODO, FIXME, XXX, and similar markers
 *
 * Usage: node qa/scripts/scanPlaceholders.mjs
 * Exit codes: 0 = clean, 1 = placeholders found
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

const CRITICAL_PATTERNS = [
  /CHANGEME/gi,
  /\[PLACEHOLDER\]/gi,
  /TODO:\s*CRITICAL/gi,
  /FIXME:\s*CRITICAL/gi,
  /throw new Error\(['"]TODO:/gi, // Unimplemented functionality
];

const IGNORED_DIRS = [
  "node_modules",
  ".next",
  "dist",
  "build",
  ".git",
  "coverage",
  "docs",
  "_artifacts",
];
const SCANNED_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".env.example",
];
// Don't scan .md files - they contain documentation TODO items

let totalIssues = 0;

function scanDirectory(dir) {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (!IGNORED_DIRS.includes(entry)) {
        scanDirectory(fullPath);
      }
    } else if (stat.isFile()) {
      const ext = extname(entry);
      if (SCANNED_EXTENSIONS.includes(ext)) {
        scanFile(fullPath);
      }
    }
  }
}

function scanFile(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    // Skip lines that are security blacklists (e.g., WEAK password sets)
    if (
      /WEAK\s*=.*Set\(.*changeme/i.test(line) ||
      /const\s+\w+\s*=.*\['.*changeme.*'\]/i.test(line)
    ) {
      return;
    }

    CRITICAL_PATTERNS.forEach((pattern) => {
      if (pattern.test(line)) {
        console.log(`${filePath}:${index + 1} - ${line.trim()}`);
        totalIssues++;
      }
    });
  });
}

// Start scan from workspace root
scanDirectory(process.cwd());

if (totalIssues > 0) {
  console.error(
    `\n❌ Found ${totalIssues} placeholder(s). Please address before deployment.`,
  );
  process.exit(1);
} else {
  console.log("✔ Placeholder scan complete - no issues detected");
  process.exit(0);
}

#!/usr/bin/env node
/**
 * TODO/FIXME Marker Gate for CI
 * 
 * Ensures new TODO/FIXME comments include issue tracking keys.
 * Runs on changed files only in CI, or all source files locally.
 * 
 * Valid TODO formats:
 *   // TODO [ISSUE-123]: description
 *   // TODO [AGENT-0001]: description  
 *   // TODO (tracked): description
 *   // TODO: description -- BLOCKED: needs infrastructure
 * 
 * Invalid (will fail CI):
 *   // TODO: some untracked work
 *   // FIXME: fix this later
 * 
 * @author [AGENT-0029]
 * @run node scripts/check-todo-markers.js [--changed]
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Patterns that make a TODO/FIXME acceptable
const ACCEPTABLE_PATTERNS = [
  /\[ISSUE-\d+\]/i,           // [ISSUE-123]
  /\[AGENT-\d{4}\]/,          // [AGENT-0029]
  /\[BUG-\d+\]/i,             // [BUG-001]
  /\[FEAT-\d+\]/i,            // [FEAT-001]
  /\(tracked\)/i,             // (tracked)
  /BLOCKED:/i,                // BLOCKED: infrastructure
  /SKIPPED:/i,                // SKIPPED: reason
  /P[0-3]:/i,                 // P0: critical
  /\[P[0-3]\]/i,              // [P1]
];

// Directories to exclude
const EXCLUDE_DIRS = [
  "node_modules",
  ".next",
  "dist",
  "build",
  ".git",
  "coverage",
  "playwright-report",
  "test-results",
  "Incoming",
  "_artifacts",
  "tmp",
];

// File extensions to check
const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

function getChangedFiles() {
  try {
    const output = execSync("git diff --name-only HEAD~1 HEAD", {
      encoding: "utf-8",
    });
    return output
      .split("\n")
      .filter((f) => f.trim() && EXTENSIONS.some((ext) => f.endsWith(ext)));
  } catch {
    return [];
  }
}

function getAllSourceFiles(dir) {
  const files = [];
  
  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        if (!EXCLUDE_DIRS.includes(entry.name)) {
          walk(fullPath);
        }
      } else if (EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

function checkFile(filePath) {
  const violations = [];
  
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // Match TODO or FIXME (case insensitive)
      const todoMatch = line.match(/\/\/\s*(TODO|FIXME)\b[:\s]*(.*)/i);
      
      if (todoMatch) {
        const marker = todoMatch[1].toUpperCase();
        const rest = todoMatch[2] || "";
        
        // Check if any acceptable pattern is present
        const isAcceptable = ACCEPTABLE_PATTERNS.some((pattern) =>
          pattern.test(rest) || pattern.test(line)
        );
        
        if (!isAcceptable) {
          violations.push({
            file: filePath,
            line: lineNum,
            marker,
            text: line.trim().substring(0, 100),
          });
        }
      }
    });
  } catch (err) {
    console.error(`Error reading ${filePath}: ${err.message}`);
  }
  
  return violations;
}

function main() {
  const args = process.argv.slice(2);
  const changedOnly = args.includes("--changed");
  const verbose = args.includes("--verbose");
  
  console.log("🔍 TODO/FIXME Marker Check");
  console.log("==========================\n");
  
  let files;
  if (changedOnly) {
    files = getChangedFiles();
    console.log(`Checking ${files.length} changed files...\n`);
  } else {
    files = getAllSourceFiles(process.cwd());
    console.log(`Checking ${files.length} source files...\n`);
  }
  
  if (files.length === 0) {
    console.log("✅ No files to check");
    process.exit(0);
  }
  
  let allViolations = [];
  
  for (const file of files) {
    const violations = checkFile(file);
    allViolations = allViolations.concat(violations);
  }
  
  if (allViolations.length === 0) {
    console.log("✅ All TODO/FIXME markers have tracking keys\n");
    process.exit(0);
  }
  
  console.log(`❌ Found ${allViolations.length} untracked TODO/FIXME markers:\n`);
  
  for (const v of allViolations) {
    const relPath = path.relative(process.cwd(), v.file);
    console.log(`  ${relPath}:${v.line}`);
    console.log(`    ${v.marker}: ${v.text.substring(v.text.indexOf(v.marker))}`);
    console.log("");
  }
  
  console.log("To fix, add a tracking key to each TODO/FIXME:");
  console.log("  // TODO [ISSUE-123]: description");
  console.log("  // TODO [AGENT-XXXX]: description");
  console.log("  // TODO: description -- BLOCKED: reason");
  console.log("");
  
  // In CI, exit with error
  if (process.env.CI) {
    process.exit(1);
  } else {
    console.log("⚠️  Running locally - not failing (set CI=true to enforce)");
    process.exit(0);
  }
}

main();

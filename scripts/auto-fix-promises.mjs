#!/usr/bin/env node
/**
 * Auto-fix unhandled promises across the codebase
 * Applies systematic error handling patterns based on issue type
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const SCAN_RESULTS = "_artifacts/scans/unhandled-promises.json";

// Read scan results
const scanData = JSON.parse(readFileSync(SCAN_RESULTS, "utf-8"));
const issues = scanData.issues || [];

console.log(`🔧 Auto-fixing ${issues.length} unhandled promise issues...\n`);

let fixed = 0;
let skipped = 0;
let failed = 0;

for (const issue of issues) {
  const { file, line, code, severity: _severity } = issue;

  // Skip test files, scripts, and certain patterns
  if (
    file.includes("/tests/") ||
    file.includes("/scripts/") ||
    file.includes(".test.") ||
    file.includes("node_modules") ||
    code.includes("setTimeout") || // Skip delay/timing utilities
    code.includes("new Promise") // Skip Promise constructors
  ) {
    console.log(`⏭️  Skipping: ${file}:${line} (excluded pattern)`);
    skipped++;
    continue;
  }

  try {
    const filePath = resolve(process.cwd(), file);
    let content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    // Get the line (0-indexed)
    const lineIndex = line - 1;
    if (lineIndex >= lines.length) {
      console.log(`⚠️  Line ${line} out of range in ${file}`);
      skipped++;
      continue;
    }

    const originalLine = lines[lineIndex];

    // Pattern 1: fetch() without try-catch (inside async function)
    if (
      originalLine.includes("await fetch(") &&
      !originalLine.includes("try")
    ) {
      // Check if already in try-catch block
      let inTryCatch = false;
      for (let i = lineIndex; i >= Math.max(0, lineIndex - 20); i--) {
        if (lines[i].trim().startsWith("try {")) {
          inTryCatch = true;
          break;
        }
      }

      if (!inTryCatch) {
        console.log(`  ${file}:${line} - fetch() needs try-catch wrapper`);
        // This requires manual intervention as we need to find function boundaries
        skipped++;
        continue;
      }
    }

    // Pattern 2: .then() without .catch()
    if (originalLine.includes(".then(") && !originalLine.includes(".catch(")) {
      // Check if .catch() is on the next line
      let hasCatch = false;
      for (let i = lineIndex; i < Math.min(lines.length, lineIndex + 5); i++) {
        if (lines[i].includes(".catch(")) {
          hasCatch = true;
          break;
        }
      }

      if (!hasCatch) {
        // Find the end of the .then() chain
        let endLine = lineIndex;
        let bracketCount = 0;
        let inThen = false;

        for (let i = lineIndex; i < lines.length; i++) {
          const line = lines[i];
          for (const char of line) {
            if (char === "(") bracketCount++;
            if (char === ")") bracketCount--;
          }

          if (line.includes(".then(")) inThen = true;

          if (inThen && bracketCount === 0 && line.includes(")")) {
            endLine = i;
            break;
          }

          if (i > lineIndex + 10) break; // Safety limit
        }

        // Add .catch() after the .then() chain
        const indent = lines[endLine].match(/^\s*/)[0];
        const catchHandler = `${indent}  .catch((error) => {\n${indent}    console.error('Promise error in ${file}:', error);\n${indent}  });`;

        // Check if line ends with semicolon
        if (lines[endLine].trim().endsWith(";")) {
          lines[endLine] = lines[endLine].replace(/;$/, "");
        }

        lines.splice(endLine + 1, 0, catchHandler);

        const newContent = lines.join("\n");
        writeFileSync(filePath, newContent, "utf-8");

        console.log(`✅ Fixed: ${file}:${line} - Added .catch() handler`);
        fixed++;
        continue;
      }
    }

    skipped++;
  } catch (error) {
    console.error(`❌ Failed to fix ${file}:${line}:`, error.message);
    failed++;
  }
}

console.log(`\n📊 Auto-fix Summary:`);
console.log(`  ✅ Fixed: ${fixed}`);
console.log(`  ⏭️  Skipped: ${skipped}`);
console.log(`  ❌ Failed: ${failed}`);
console.log(`  📝 Total: ${issues.length}`);

if (fixed > 0) {
  console.log(`\n⚠️  Run 'pnpm typecheck' to verify changes`);
}

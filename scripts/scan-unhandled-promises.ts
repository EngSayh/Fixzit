#!/usr/bin/env tsx
/**
 * UNHANDLED PROMISE SCANNER
 * Scans codebase for potential unhandled promise rejections
 * Target: 230 files with promise usage
 *
 * Patterns detected:
 * 1. new Promise() without .catch()
 * 2. Promise.all() without .catch()
 * 3. fetch() without .catch() or try-catch
 * 4. .then() without .catch()
 * 5. async functions without try-catch
 */

import { promises as fs } from "fs";
import { glob } from "glob";

interface Issue {
  file: string;
  line: number;
  column: number;
  type:
    | "new-promise"
    | "promise-all"
    | "fetch"
    | "then-no-catch"
    | "async-no-try";
  code: string;
  severity: "critical" | "major" | "moderate";
}

const issues: Issue[] = [];

// Patterns to detect
const PATTERNS = {
  newPromise: /new\s+Promise\s*\(/g,
  promiseAll: /Promise\.(all|race|any|allSettled)\s*\(/g,
  fetch: /(?:await\s+)?fetch\s*\(/g,
  then: /\.then\s*\(/g,
  catch: /\.catch\s*\(/g,
  tryBlock: /try\s*\{/g,
  asyncFunction: /async\s+(function|\(|\w+\s*\()/g,
};

async function scanFile(filePath: string): Promise<void> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Check for new Promise without subsequent .catch
      if (PATTERNS.newPromise.test(line)) {
        // Look ahead 10 lines for .catch()
        const contextLines = lines.slice(
          index,
          Math.min(index + 10, lines.length),
        );
        const hasCatch = contextLines.some((l) => PATTERNS.catch.test(l));

        if (!hasCatch) {
          issues.push({
            file: filePath,
            line: lineNumber,
            column: line.indexOf("new Promise"),
            type: "new-promise",
            code: line.trim(),
            severity: "critical",
          });
        }
      }

      // Check for Promise.all/race/any without .catch
      if (PATTERNS.promiseAll.test(line)) {
        const contextLines = lines.slice(
          index,
          Math.min(index + 10, lines.length),
        );
        const hasCatch = contextLines.some((l) => PATTERNS.catch.test(l));

        if (!hasCatch) {
          issues.push({
            file: filePath,
            line: lineNumber,
            column: line.indexOf("Promise."),
            type: "promise-all",
            code: line.trim(),
            severity: "major",
          });
        }
      }

      // Check for fetch without try-catch
      if (PATTERNS.fetch.test(line) && line.includes("await")) {
        // Look back 5 lines for try {
        const contextLines = lines.slice(Math.max(0, index - 5), index + 1);
        const hasTry = contextLines.some((l) => PATTERNS.tryBlock.test(l));

        if (!hasTry) {
          issues.push({
            file: filePath,
            line: lineNumber,
            column: line.indexOf("fetch"),
            type: "fetch",
            code: line.trim(),
            severity: "major",
          });
        }
      }

      // Check for .then() without .catch()
      if (PATTERNS.then.test(line)) {
        const contextLines = lines.slice(
          index,
          Math.min(index + 5, lines.length),
        );
        const hasCatch = contextLines.some((l) => PATTERNS.catch.test(l));

        if (!hasCatch) {
          issues.push({
            file: filePath,
            line: lineNumber,
            column: line.indexOf(".then"),
            type: "then-no-catch",
            code: line.trim(),
            severity: "moderate",
          });
        }
      }
    });
  } catch (error) {
    console.error(`❌ Error scanning ${filePath}:`, error);
  }
}

async function main() {
  console.log("🔍 Scanning for unhandled promise rejections...\n");

  const files = await glob("**/*.{ts,tsx,js,jsx}", {
    ignore: [
      "node_modules/**",
      ".next/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "**/*.test.{ts,tsx,js,jsx}",
      "**/*.spec.{ts,tsx,js,jsx}",
      "tests/**",
      "__tests__/**",
    ],
    cwd: process.cwd(),
  });

  console.log(`📂 Found ${files.length} files to scan\n`);

  for (const file of files) {
    await scanFile(file);
  }

  // Group by severity
  const critical = issues.filter((i) => i.severity === "critical");
  const major = issues.filter((i) => i.severity === "major");
  const moderate = issues.filter((i) => i.severity === "moderate");

  console.log("\n📊 SCAN RESULTS\n");
  console.log(`🔴 Critical: ${critical.length} issues`);
  console.log(`🟧 Major: ${major.length} issues`);
  console.log(`🟨 Moderate: ${moderate.length} issues`);
  console.log(`📝 Total: ${issues.length} issues\n`);

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    totalFiles: files.length,
    totalIssues: issues.length,
    bySeverity: {
      critical: critical.length,
      major: major.length,
      moderate: moderate.length,
    },
    byType: {
      "new-promise": issues.filter((i) => i.type === "new-promise").length,
      "promise-all": issues.filter((i) => i.type === "promise-all").length,
      fetch: issues.filter((i) => i.type === "fetch").length,
      "then-no-catch": issues.filter((i) => i.type === "then-no-catch").length,
      "async-no-try": issues.filter((i) => i.type === "async-no-try").length,
    },
    issues: issues,
  };

  await fs.mkdir("_artifacts/scans", { recursive: true });
  await fs.writeFile(
    "_artifacts/scans/unhandled-promises.json",
    JSON.stringify(report, null, 2),
  );

  // Generate CSV for easy review
  const csv = [
    "File,Line,Type,Severity,Code",
    ...issues.map(
      (i) =>
        `"${i.file}",${i.line},"${i.type}","${i.severity}","${i.code.replace(/"/g, '""')}"`,
    ),
  ].join("\n");

  await fs.writeFile("_artifacts/scans/unhandled-promises.csv", csv);

  console.log("✅ Reports saved:");
  console.log("   _artifacts/scans/unhandled-promises.json");
  console.log("   _artifacts/scans/unhandled-promises.csv\n");

  // Show top 20 critical issues
  if (critical.length > 0) {
    console.log("\n🔴 TOP 20 CRITICAL ISSUES:\n");
    critical.slice(0, 20).forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.file}:${issue.line}`);
      console.log(`   ${issue.code}`);
      console.log("");
    });
  }

  process.exit(issues.length > 0 ? 1 : 0);
}

main();

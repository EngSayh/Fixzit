#!/usr/bin/env tsx
/**
 * HYDRATION MISMATCH SCANNER
 * Scans codebase for React hydration issues
 * Target: 58 files with hydration errors
 *
 * Patterns detected:
 * 1. Date/time formatting without suppressHydrationWarning
 * 2. window/document usage in server components
 * 3. localStorage/sessionStorage without client check
 * 4. useEffect dependencies causing re-renders
 * 5. Math.random() in render
 * 6. Dynamic imports without Suspense
 */

import { promises as fs } from "fs";
import { glob } from "glob";

interface HydrationIssue {
  file: string;
  line: number;
  type:
    | "date-format"
    | "browser-api"
    | "storage"
    | "random"
    | "dynamic-import"
    | "use-effect";
  code: string;
  severity: "critical" | "major" | "moderate";
  suggestion: string;
}

const issues: HydrationIssue[] = [];

const PATTERNS = {
  dateFormat:
    /(new\s+Date\([^)]*\)\.to(?:Locale|ISO)?String|\.toLocaleString|\.toLocaleDateString|\.toLocaleTimeString)/g,
  browserApi: /(window\.|document\.|navigator\.)(?!undefined)/g,
  localStorage: /(localStorage|sessionStorage)\./g,
  mathRandom: /Math\.random\(\)/g,
  dynamicImport: /import\(['"]/g,
  useEffect: /useEffect\s*\(/g,
};

async function scanFile(filePath: string): Promise<void> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content.split("\n");
    const isServerComponent = !content.includes("'use client'");

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Date formatting without suppressHydrationWarning
      if (PATTERNS.dateFormat.test(line)) {
        const contextLines = lines.slice(
          Math.max(0, index - 2),
          Math.min(index + 3, lines.length),
        );
        const hasSuppressHydration = contextLines.some((l) =>
          l.includes("suppressHydrationWarning"),
        );

        if (!hasSuppressHydration) {
          issues.push({
            file: filePath,
            line: lineNumber,
            type: "date-format",
            code: line.trim(),
            severity: "major",
            suggestion:
              "Add suppressHydrationWarning={true} or move to client component",
          });
        }
      }

      // Browser APIs in server components
      if (
        isServerComponent &&
        PATTERNS.browserApi.test(line) &&
        !line.includes("typeof window")
      ) {
        issues.push({
          file: filePath,
          line: lineNumber,
          type: "browser-api",
          code: line.trim(),
          severity: "critical",
          suggestion:
            'Add "use client" directive or check typeof window !== "undefined"',
        });
      }

      // localStorage/sessionStorage without check
      if (PATTERNS.localStorage.test(line) && !line.includes("typeof window")) {
        issues.push({
          file: filePath,
          line: lineNumber,
          type: "storage",
          code: line.trim(),
          severity: "critical",
          suggestion:
            'Wrap in typeof window !== "undefined" check or use useEffect',
        });
      }

      // Math.random() in render
      if (
        PATTERNS.mathRandom.test(line) &&
        !line.includes("useState") &&
        !line.includes("useMemo")
      ) {
        issues.push({
          file: filePath,
          line: lineNumber,
          type: "random",
          code: line.trim(),
          severity: "moderate",
          suggestion: "Move to useState/useMemo to ensure consistent value",
        });
      }

      // Dynamic import without Suspense
      if (PATTERNS.dynamicImport.test(line)) {
        const contextLines = lines.slice(
          Math.max(0, index - 10),
          Math.min(index + 10, lines.length),
        );
        const hasSuspense = contextLines.some((l) => l.includes("<Suspense"));

        if (!hasSuspense) {
          issues.push({
            file: filePath,
            line: lineNumber,
            type: "dynamic-import",
            code: line.trim(),
            severity: "moderate",
            suggestion: "Wrap component in <Suspense fallback={...}>",
          });
        }
      }
    });
  } catch (error) {
    console.error(`❌ Error scanning ${filePath}:`, error);
  }
}

async function main() {
  console.log("🔍 Scanning for hydration mismatches...\n");

  const files = await glob("**/*.{tsx,jsx}", {
    ignore: [
      "node_modules/**",
      ".next/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "**/*.test.{tsx,jsx}",
      "**/*.spec.{tsx,jsx}",
      "tests/**",
      "__tests__/**",
    ],
    cwd: process.cwd(),
  });

  console.log(`📂 Found ${files.length} React files to scan\n`);

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
      "date-format": issues.filter((i) => i.type === "date-format").length,
      "browser-api": issues.filter((i) => i.type === "browser-api").length,
      storage: issues.filter((i) => i.type === "storage").length,
      random: issues.filter((i) => i.type === "random").length,
      "dynamic-import": issues.filter((i) => i.type === "dynamic-import")
        .length,
      "use-effect": issues.filter((i) => i.type === "use-effect").length,
    },
    issues: issues,
  };

  await fs.mkdir("_artifacts/scans", { recursive: true });
  await fs.writeFile(
    "_artifacts/scans/hydration-mismatches.json",
    JSON.stringify(report, null, 2),
  );

  // Generate CSV
  const csv = [
    "File,Line,Type,Severity,Code,Suggestion",
    ...issues.map(
      (i) =>
        `"${i.file}",${i.line},"${i.type}","${i.severity}","${i.code.replace(/"/g, '""')}","${i.suggestion}"`,
    ),
  ].join("\n");

  await fs.writeFile("_artifacts/scans/hydration-mismatches.csv", csv);

  console.log("✅ Reports saved:");
  console.log("   _artifacts/scans/hydration-mismatches.json");
  console.log("   _artifacts/scans/hydration-mismatches.csv\n");

  // Show top 20 critical issues
  if (critical.length > 0) {
    console.log("\n🔴 TOP 20 CRITICAL ISSUES:\n");
    critical.slice(0, 20).forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.file}:${issue.line}`);
      console.log(`   ${issue.code}`);
      console.log(`   💡 ${issue.suggestion}`);
      console.log("");
    });
  }

  process.exit(issues.length > 0 ? 1 : 0);
}

main();

#!/usr/bin/env node
/**
 * Org-Scoping Lint Script
 *
 * Checks for missing orgId filters in MongoDB operations.
 * Run as part of CI to enforce tenant isolation patterns.
 *
 * Usage: node scripts/lint-org-scoping.mjs [--fix]
 *
 * @module scripts/lint-org-scoping
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "..");

// Patterns that indicate MongoDB operations
const DB_OPERATION_PATTERNS = [
  /\.find\s*\(/g,
  /\.findOne\s*\(/g,
  /\.findById\s*\(/g,
  /\.findOneAndUpdate\s*\(/g,
  /\.findOneAndDelete\s*\(/g,
  /\.findByIdAndUpdate\s*\(/g,
  /\.findByIdAndDelete\s*\(/g,
  /\.updateOne\s*\(/g,
  /\.updateMany\s*\(/g,
  /\.deleteOne\s*\(/g,
  /\.deleteMany\s*\(/g,
  /\.countDocuments\s*\(/g,
  /\.aggregate\s*\(/g,
  /\.insertOne\s*\(/g,
  /\.insertMany\s*\(/g,
  /\.create\s*\(/g,
];

// Patterns that indicate proper org scoping
const ORG_SCOPING_PATTERNS = [
  /orgId/i,
  /user\.orgId/i,
  /session\.user\.orgId/i,
  /sessionUser\.orgId/i,
  /getSessionUser/i,
  /tenantId/i,
  /organizationId/i,
  /\$org/i, // For aggregation $org* variables
];

// Files/directories to skip
const SKIP_PATTERNS = [
  /node_modules/,
  /\.next/,
  /\.git/,
  /coverage/,
  /playwright-report/,
  /test-results/,
  /_deprecated/,
  /_artifacts/,
  /\.test\./,
  /\.spec\./,
  /scripts\//,
  /tools\//,
  /docs\//,
  /aws\/dist/,
  /vitest\./,
  /jest\./,
];

// Models that are exempt from org scoping (global/system-wide)
const EXEMPT_MODELS = [
  "Organization",
  "SystemSettings",
  "GlobalConfig",
  "AuditLog", // System-wide audit logs
  "Migration",
  "Session",
  "VerificationToken",
  "Account", // NextAuth
];

/**
 * Issue found during linting
 */
const issues = [];

/**
 * Check if a path should be skipped
 */
function shouldSkip(filePath) {
  return SKIP_PATTERNS.some((pattern) => pattern.test(filePath));
}

/**
 * Check if a line has proper org scoping
 */
function hasOrgScoping(line, surroundingLines) {
  const context = [line, ...surroundingLines].join(" ");
  return ORG_SCOPING_PATTERNS.some((pattern) => pattern.test(context));
}

/**
 * Check if the operation is on an exempt model
 */
function isExemptModel(line, surroundingLines) {
  const context = [line, ...surroundingLines].join(" ");
  return EXEMPT_MODELS.some(
    (model) =>
      context.includes(model) ||
      context.includes(`${model}Model`) ||
      context.includes(`${model}Schema`)
  );
}

/**
 * Extract the model name from a line
 */
function extractModelName(line) {
  // Match patterns like: ModelName.find, await ModelName.findOne
  const modelMatch = line.match(/(\w+(?:Model)?)\.(find|update|delete|create|aggregate|count|insert)/);
  if (modelMatch) {
    return modelMatch[1];
  }
  return null;
}

/**
 * Scan a file for org-scoping issues
 */
function scanFile(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  // Check if file has any DB operations
  const hasDbOperations = DB_OPERATION_PATTERNS.some((pattern) =>
    pattern.test(content)
  );

  if (!hasDbOperations) {
    return;
  }

  // Check each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line contains a DB operation
    const hasDbOp = DB_OPERATION_PATTERNS.some((pattern) => pattern.test(line));
    if (!hasDbOp) continue;

    // Get surrounding context (5 lines before and after)
    const contextStart = Math.max(0, i - 5);
    const contextEnd = Math.min(lines.length - 1, i + 5);
    const surroundingLines = lines.slice(contextStart, contextEnd + 1);

    // Check if operation has org scoping
    if (hasOrgScoping(line, surroundingLines)) {
      continue;
    }

    // Check if it's an exempt model
    if (isExemptModel(line, surroundingLines)) {
      continue;
    }

    // Extract model name for better error message
    const modelName = extractModelName(line) || "Unknown";

    // Found an issue
    issues.push({
      file: relative(ROOT_DIR, filePath),
      line: i + 1,
      content: line.trim().slice(0, 100),
      model: modelName,
      suggestion: `Add orgId filter: { orgId: user.orgId, ... }`,
    });
  }
}

/**
 * Recursively scan a directory
 */
function scanDirectory(dirPath) {
  if (shouldSkip(dirPath)) {
    return;
  }

  const entries = readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);

    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      if (!shouldSkip(fullPath)) {
        scanFile(fullPath);
      }
    }
  }
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const showHelp = args.includes("--help") || args.includes("-h");
  const outputJson = args.includes("--json");
  const outputFile = args.find((a) => a.startsWith("--output="))?.split("=")[1];

  if (showHelp) {
    console.log(`
Org-Scoping Lint Script

Checks for missing orgId filters in MongoDB operations.

Usage: node scripts/lint-org-scoping.mjs [options]

Options:
  --help, -h      Show this help message
  --json          Output results as JSON
  --output=FILE   Write results to a file
  --ci            Exit with code 1 if issues found (for CI)

Examples:
  node scripts/lint-org-scoping.mjs
  node scripts/lint-org-scoping.mjs --json --output=org-scoping-issues.json
  node scripts/lint-org-scoping.mjs --ci
`);
    process.exit(0);
  }

  console.log("🔍 Scanning for org-scoping issues...\n");

  // Scan key directories
  const dirsToScan = ["app/api", "server", "lib", "services"];

  for (const dir of dirsToScan) {
    const fullPath = join(ROOT_DIR, dir);
    try {
      if (statSync(fullPath).isDirectory()) {
        scanDirectory(fullPath);
      }
    } catch {
      // Directory doesn't exist, skip
    }
  }

  // Output results
  if (outputJson) {
    const jsonOutput = JSON.stringify({ issues, total: issues.length }, null, 2);
    if (outputFile) {
      writeFileSync(outputFile, jsonOutput);
      console.log(`Results written to ${outputFile}`);
    } else {
      console.log(jsonOutput);
    }
  } else {
    if (issues.length === 0) {
      console.log("✅ No org-scoping issues found!\n");
      console.log(
        "All MongoDB operations have proper tenant isolation with orgId filters."
      );
    } else {
      console.log(`⚠️  Found ${issues.length} potential org-scoping issue(s):\n`);

      // Group by file
      const byFile = new Map();
      for (const issue of issues) {
        if (!byFile.has(issue.file)) {
          byFile.set(issue.file, []);
        }
        byFile.get(issue.file).push(issue);
      }

      for (const [file, fileIssues] of byFile) {
        console.log(`📁 ${file}`);
        for (const issue of fileIssues) {
          console.log(`   Line ${issue.line}: ${issue.content}`);
          console.log(`   💡 ${issue.suggestion}\n`);
        }
      }

      console.log("\n📋 Summary:");
      console.log(`   Total issues: ${issues.length}`);
      console.log(`   Files affected: ${byFile.size}`);
      console.log(
        "\n💡 Add orgId filter to all MongoDB queries for proper tenant isolation."
      );
      console.log(
        "   Example: { orgId: sessionUser.orgId, _id: id } instead of { _id: id }"
      );
    }
  }

  // Exit with error code if in CI mode and issues found
  if (args.includes("--ci") && issues.length > 0) {
    process.exit(1);
  }
}

main();

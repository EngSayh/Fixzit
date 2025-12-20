#!/usr/bin/env node
/**
 * Pre-commit hook to ensure @ts-expect-error comments include reasons
 * Checks staged .ts/.tsx files for @ts-expect-error without explanatory comments
 */
import { execSync } from "child_process";

const getStagedFiles = () => {
  try {
    const output = execSync("git diff --cached --name-only --diff-filter=ACM", {
      encoding: "utf8",
    });
    return output
      .split("\n")
      .filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));
  } catch {
    return [];
  }
};

const checkFile = (file) => {
  try {
    const content = execSync(`git show :${file}`, { encoding: "utf8" });
    const lines = content.split("\n");
    const issues = [];

    lines.forEach((line, idx) => {
      // Match @ts-expect-error without a reason (just the directive alone)
      if (
        line.includes("@ts-expect-error") &&
        !line.match(/@ts-expect-error\s+\S/)
      ) {
        issues.push({ file, line: idx + 1, content: line.trim() });
      }
    });

    return issues;
  } catch {
    return [];
  }
};

const main = () => {
  const stagedFiles = getStagedFiles();

  if (stagedFiles.length === 0) {
    console.log("✅ No staged JS/TS files to check for @ts-expect-error comments.");
    process.exit(0);
  }

  const allIssues = stagedFiles.flatMap(checkFile);

  if (allIssues.length === 0) {
    console.log("✅ @ts-expect-error comments include reasons in staged files.");
    process.exit(0);
  }

  console.error("❌ Found @ts-expect-error without reasons:");
  allIssues.forEach(({ file, line, content }) => {
    console.error(`  ${file}:${line} - ${content}`);
  });
  console.error("\nPlease add a reason after @ts-expect-error, e.g.:");
  console.error("  // @ts-expect-error - Legacy API returns unknown type");
  process.exit(1);
};

main();

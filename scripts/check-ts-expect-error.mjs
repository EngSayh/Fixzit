#!/usr/bin/env node
/**
 * @fileoverview Enforce @ts-expect-error comments include a reason in staged files.
 *
 * This guard prevents undocumented suppressions from being committed.
 * It only inspects staged JS/TS files to avoid legacy noise.
 */
import { execFileSync } from "node:child_process";

const git = (args) => execFileSync("git", args, { encoding: "utf8" });

const stagedFiles = git([
  "diff",
  "--cached",
  "--name-only",
  "--diff-filter=ACMR",
])
  .trim()
  .split("\n")
  .map((file) => file.trim())
  .filter(Boolean)
  .filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file))
  .filter((file) => !file.includes("node_modules/"));

if (!stagedFiles.length) {
  console.log("✅ No staged JS/TS files to check for @ts-expect-error comments.");
  process.exit(0);
}

const issues = [];
const marker = "@ts-expect-error";

for (const file of stagedFiles) {
  let contents = "";
  try {
    contents = execFileSync("git", ["show", `:${file}`], {
      encoding: "utf8",
    });
  } catch {
    continue;
  }

  const lines = contents.split("\n");
  lines.forEach((line, index) => {
    if (!line.includes(marker)) return;
    const after = line.split(marker)[1] ?? "";
    if (!after.trim()) {
      issues.push({
        file,
        line: index + 1,
        code: line.trim(),
      });
    }
  });
}

if (issues.length) {
  console.error("❌ @ts-expect-error must include a reason:");
  for (const issue of issues) {
    console.error(`  - ${issue.file}:${issue.line} → ${issue.code}`);
  }
  console.error("Add a reason, e.g. // @ts-expect-error - upstream type mismatch");
  process.exit(1);
}

console.log("✅ @ts-expect-error comments include reasons in staged files.");

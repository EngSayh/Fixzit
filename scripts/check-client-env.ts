/**
 * Check for forbidden process.env usage in client components.
 * Flags any env access in files marked with "use client" that are not NEXT_PUBLIC.
 */

import fs from "fs";
import path from "path";
import fg from "fast-glob";

type EnvAccess = {
  file: string;
  variable: string;
  line: number;
};

const CLIENT_GLOB = [
  "app/**/*.tsx",
  "app/**/*.ts",
  "components/**/*.tsx",
  "components/**/*.ts",
];

const IGNORE = [
  "**/api/**",
  "**/server/**",
  "**/services/**",
  "**/tests/**",
  "**/*.d.ts",
  "**/node_modules/**",
];

function isClientFile(contents: string): boolean {
  const firstStatement = contents.split("\n").find((line) => line.trim().length);
  return firstStatement?.trim() === '"use client"' || firstStatement?.trim() === "'use client'";
}

function findEnvAccesses(filePath: string, contents: string): EnvAccess[] {
  const matches: EnvAccess[] = [];
  const envRegex = /process\.env(?:\[['"]([^'"]+)['"]\]|\.([A-Z0-9_]+))/g;

  let match: RegExpExecArray | null;
  while ((match = envRegex.exec(contents))) {
    const variable = match[1] || match[2];
    if (!variable || variable.startsWith("NEXT_PUBLIC")) continue;

    const beforeMatch = contents.slice(0, match.index);
    const line = beforeMatch.split("\n").length;

    matches.push({
      file: filePath,
      variable,
      line,
    });
  }

  return matches;
}

async function main() {
  const files = await fg(CLIENT_GLOB, { ignore: IGNORE, absolute: true });
  const violations: EnvAccess[] = [];

  for (const file of files) {
    const contents = fs.readFileSync(file, "utf8");
    if (!isClientFile(contents)) continue;

    violations.push(...findEnvAccesses(file, contents));
  }

  if (violations.length === 0) {
    console.log("✅ No forbidden process.env usage found in client components.");
    return;
  }

  console.error("❌ Forbidden process.env usage found in client components:");
  for (const v of violations) {
    console.error(`  - ${path.relative(process.cwd(), v.file)}:${v.line} → process.env.${v.variable}`);
  }
  process.exitCode = 1;
}

void main();

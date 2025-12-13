#!/usr/bin/env npx tsx
/**
 * Minimal Issue Log CLI
 * Usage:
 *   pnpm issue-log import ./BACKLOG_AUDIT.json [--dry-run]
 */

import fs from "fs";
import path from "path";

const API_BASE = process.env.ISSUE_API_URL || "http://localhost:3000/api";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

function usage(): void {
  console.log("Usage: pnpm issue-log import <file> [--dry-run]");
}

type IssueImport = {
  key: string;
  title: string;
  category?: string;
  priority?: string;
  status?: string;
  location?: string;
  sourcePath: string;
  sourceRef: string;
  evidenceSnippet: string;
  externalId?: string | null;
  description?: string;
};

async function importIssues(filePath: string, dryRun: boolean) {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }

  const rawContent = fs.readFileSync(resolved, "utf8");
  const parsed = JSON.parse(rawContent);
  const payload: { issues: IssueImport[]; dryRun: boolean } = Array.isArray(parsed)
    ? { issues: parsed, dryRun }
    : { issues: parsed.issues || [], dryRun };

  if (!Array.isArray(payload.issues) || payload.issues.length === 0) {
    throw new Error("No issues provided in file");
  }

  const response = await fetch(`${API_BASE}/issues/import`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.ISSUE_API_TOKEN
        ? { Authorization: `Bearer ${process.env.ISSUE_API_TOKEN}` }
        : {}),
      ...ROBOTS_HEADER,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || "Import failed");
  }

  const result: {
    created?: number;
    updated?: number;
    skipped?: number;
    errors?: Array<{ index: number; error: string; key?: string }>;
  } = data.result || {};
  console.log(
    `Import complete${dryRun ? " (dry-run)" : ""}: created=${result.created ?? 0}, updated=${result.updated ?? 0}, skipped=${result.skipped ?? 0}`
  );
  if (Array.isArray(result.errors) && result.errors.length > 0) {
    console.log("Errors:");
    result.errors.forEach((err: { index: number; error: string; key?: string }) => {
      console.log(` - [${err.index}] ${err.error} ${err.key ? `(key: ${err.key})` : ""}`);
    });
  }
}

async function main() {
  const [, , command, fileArg, ...rest] = process.argv;
  const dryRun = rest.includes("--dry-run");

  if (command !== "import" || !fileArg) {
    usage();
    process.exit(1);
  }

  try {
    await importIssues(fileArg, dryRun);
  } catch (error) {
    console.error("❌", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();

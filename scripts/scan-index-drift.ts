#!/usr/bin/env npx tsx
/**
 * Scan for schema-level index definitions that should be centralized.
 *
 * Purpose:
 * - Identify models still calling `.index()` so we can migrate them to
 *   lib/db/collections.ts and disable schema autoIndex in production.
 *
 * Usage:
 *   pnpm tsx scripts/scan-index-drift.ts
 */

import fg from "fast-glob";
import fs from "fs";
import path from "path";

async function main() {
  const projectRoot = path.resolve(__dirname, "..");
  const pattern = path.join(projectRoot, "server/models/**/*.ts").replace(/\\/g, "/");
  const files = await fg(pattern, { dot: false });

  const offenders: Array<{ file: string; count: number }> = [];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    const matches = content.match(/\.index\s*\(/g);
    if (matches && matches.length > 0) {
      offenders.push({ file: path.relative(projectRoot, file), count: matches.length });
    }
  }

  if (offenders.length === 0) {
    console.log("✅ No schema-level index definitions found.");
    return;
  }

  console.log("⚠️  Schema-level index definitions detected (candidate for centralization):");
  offenders
    .sort((a, b) => b.count - a.count)
    .forEach(({ file, count }) => {
      console.log(` - ${file} (${count} index calls)`);
    });

  console.log(
    "\nAction: Move these indexes to lib/db/collections.ts and set autoIndex:false on the schema to avoid IndexOptionsConflict in Atlas.",
  );
}

main().catch((err) => {
  console.error("❌ scan-index-drift failed:", err);
  process.exit(1);
});

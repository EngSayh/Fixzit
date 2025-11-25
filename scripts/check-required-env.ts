#!/usr/bin/env tsx
/**
 * Quick sanity check for required local environment variables.
 *
 * Fails fast when MARKETPLACE_ENABLED is missing so developers
 * do not waste time debugging 501 responses from marketplace APIs.
 */

import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const cwd = process.cwd();
const envFiles = [".env.local", ".env"];

for (const file of envFiles) {
  const fullPath = path.join(cwd, file);
  if (fs.existsSync(fullPath)) {
    dotenv.config({ path: fullPath, override: false });
  }
}

const issues: string[] = [];

if (typeof process.env.MARKETPLACE_ENABLED === "undefined") {
  issues.push("MARKETPLACE_ENABLED is not set.");
} else if (process.env.MARKETPLACE_ENABLED !== "true") {
  issues.push(
    `MARKETPLACE_ENABLED is currently "${process.env.MARKETPLACE_ENABLED}". Set it to "true" to enable marketplace routes.`,
  );
}

if (issues.length > 0) {
  console.error("\nEnvironment validation failed:\n");
  for (const issue of issues) {
    console.error(` • ${issue}`);
  }
  console.error(
    "\nFix: add `MARKETPLACE_ENABLED=true` to your local `.env` file.",
  );
  console.error(
    "See docs/guides/READY_TO_START.md for the full checklist, then re-run `pnpm check:env`.",
  );
  process.exit(1);
}

console.log("✅ Environment check passed: MARKETPLACE_ENABLED=true");

#!/usr/bin/env node
/**
 * Initialize the local agent lock file if missing.
 * This file is gitignored and used for coordination only.
 */
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dir = path.join(root, ".fixzit");
const file = path.join(dir, "agent-assignments.json");

const payload = {
  version: "6.0.0",
  lastUpdated: new Date().toISOString(),
  activeAgents: [],
  pathLocks: {},
};

async function ensureLockFile() {
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(file);
    console.log(`[agent-lock-init] OK: ${file} exists.`);
    return;
  } catch {
    await fs.writeFile(file, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.log(`[agent-lock-init] Created ${file}.`);
  }
}

ensureLockFile().catch((err) => {
  console.error("[agent-lock-init] ERROR:", err?.message || err);
  process.exit(1);
});

#!/usr/bin/env tsx
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(filePath: string, content: string) {
  const dir = path.dirname(filePath);
  ensureDir(dir);
  fs.writeFileSync(filePath, content, "utf8");
  console.log("Created: " + filePath.replace(ROOT, "."));
}

console.log("Setting up Consolidation Guardrails...\n");

// Complete governance YAML
writeFile(
  path.join(ROOT, "config/fixzit.governance.yaml"),
  '# Fixzit Governance Configuration\nbranding:\n  colors:\n    primary: "#0061A8"\n    secondary: "#00A859"\n    accent: "#FFB400"\n',
);

console.log("\nAll files created!");

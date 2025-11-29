#!/usr/bin/env node
/**
 * Guardrail: flag native Mongo findOneAndUpdate/Delete/Replace usage without unwrapFindOneResult.
 *
 * Heuristic:
 * - Scans .ts/.tsx under app/api
 * - Flags files that use native collection (.collection() + findOneAnd*) and do NOT import/use unwrapFindOneResult.
 * - Mongoose .findOneAndUpdate is ignored (no .collection()).
 */
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const TARGET_DIR = path.join(ROOT, "app", "api");
const findings = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.isFile() && (full.endsWith(".ts") || full.endsWith(".tsx"))) {
        inspectFile(full);
    }
  }
}

function inspectFile(file) {
  const content = fs.readFileSync(file, "utf8");
  const usesNative =
    (content.includes("getDatabase") || content.includes("mongodb-unified")) &&
    content.includes(".collection(");
  const usesFindOne =
    /collection\([^)]*\)\.[^\n]*findOneAnd(Update|Delete|Replace)/.test(
      content,
    );
  const hasUnwrap = content.includes("unwrapFindOneResult");
  if (usesNative && usesFindOne && !hasUnwrap) {
    findings.push(file.replace(ROOT + path.sep, ""));
  }
}

if (fs.existsSync(TARGET_DIR)) {
  walk(TARGET_DIR);
}

if (findings.length) {
  console.error("⚠️  Mongo unwrap guard: files using native findOneAnd* without unwrapFindOneResult:");
  findings.forEach((f) => console.error(" -", f));
  process.exit(1);
} else {
  console.log("✅ Mongo unwrap guard: no unwrapped native findOneAnd* patterns detected under app/api.");
}

// Simple OpenAPI validation + artifact copy
// Validates that openapi.yaml can be parsed and copies it to _artifacts/openapi.yaml
// to keep CI/publishing consistent even without an external generator.

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const root = path.resolve(__dirname, "..");
const srcPath = path.join(root, "openapi.yaml");
const outDir = path.join(root, "_artifacts");
const outPath = path.join(outDir, "openapi.yaml");

try {
  const raw = fs.readFileSync(srcPath, "utf8");
  const doc = yaml.load(raw);

  if (!doc || typeof doc !== "object" || !doc.openapi) {
    throw new Error("Invalid OpenAPI document: missing root fields");
  }

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, raw, "utf8");

  console.log(`[openapi:build] Validated and copied to ${outPath}`);
  process.exit(0);
} catch (error) {
  console.error("[openapi:build] Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
}

import fs from "node:fs";

const candidates = [
  "openapi.yaml",
  "openapi.yml",
  "apps/api/openapi.yaml",
  "apps/api/openapi.yml"
];

const existing = candidates.find((p) => fs.existsSync(p));
if (existing) {
  console.log(`[openapi] found ${existing}, copying to ./openapi.yaml`);
  fs.copyFileSync(existing, "openapi.yaml");
  process.exit(0);
}

// Minimal valid skeleton so CI has an artifact
const skeleton = `openapi: 3.0.3
info:
  title: Fixzit API
  version: 0.1.0
paths: {}
components: {}
`;
fs.writeFileSync("openapi.yaml", skeleton);
console.log("[openapi] skeleton created at ./openapi.yaml");

/**
 * Minimal smoke test for merge-memory.js
 * Run with: node tools/tests/merge-memory.smoke.js
 */

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execSync } = require("child_process");

const MERGE_SCRIPT = path.resolve(__dirname, "..", "merge-memory.js");

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function runMerge(outputsDir, masterPath, extraArgs = []) {
  const args = [
    MERGE_SCRIPT,
    "--outputs",
    outputsDir,
    "--master",
    masterPath,
    "--allow-empty",
    ...extraArgs,
  ];
  execSync(`node ${args.join(" ")}`, { stdio: "inherit" });
}

function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "merge-memory-smoke-"));
  const outputsDir = path.join(tmp, "outputs");
  fs.mkdirSync(outputsDir);
  const masterPath = path.join(tmp, "master-index.json");

  // Good file with markdown fences and duplicates
  write(
    path.join(outputsDir, "good.json"),
    "```json\n[\n  {\"file\":\"a.ts\",\"category\":\"core\",\"summary\":\"A\",\"exports\":[],\"dependencies\":[]},\n  {\"file\":\"a.ts\",\"category\":\"core\",\"summary\":\"dup\",\"exports\":[],\"dependencies\":[]}\n]\n```",
  );

  // Bad file (not an array)
  write(path.join(outputsDir, "bad.json"), '{"foo":"bar"}');

  // Malformed JSON
  write(path.join(outputsDir, "broken.json"), "[{]");

  runMerge(outputsDir, masterPath);

  const master = JSON.parse(fs.readFileSync(masterPath, "utf8"));
  assert(Array.isArray(master), "master-index should be an array");
  assert.strictEqual(master.length, 1, "deduped entries should be 1");
  assert.strictEqual(master[0].file, "a.ts");
  assert.strictEqual(master[0].category, "core");

  console.log("merge-memory.smoke.js: PASS");
}

main();

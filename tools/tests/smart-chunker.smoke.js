/**
 * Minimal smoke test for smart-chunker.js
 * Verifies ignore list and batching without writing files (dry-run).
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execSync } = require("child_process");

const CHUNKER = path.resolve(__dirname, "..", "smart-chunker.js");

function mkdirp(p) {
  fs.mkdirSync(p, { recursive: true });
}

function write(filePath, content = "// test") {
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
}

function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "chunker-smoke-"));
  // Create files across categories and ignored dirs
  write(path.join(tmp, "routes", "api", "foo.ts"), "export const foo = 1;");
  write(path.join(tmp, "models", "bar.model.ts"), "export const bar = 2;");
  write(path.join(tmp, "components", "baz.tsx"), "export const Baz = () => null;");
  write(path.join(tmp, "lib", "util.ts"), "export const u = 3;");
  write(path.join(tmp, "core.ts"), "export const core = 4;");
  // Ignored
  write(path.join(tmp, "node_modules", "ignore.js"), "ignored");
  write(path.join(tmp, "ai-memory", "skip.ts"), "ignored");
  write(path.join(tmp, "tools", "skip.ts"), "ignored");

  // Run dry-run against tmp dir
  execSync(`cd "${tmp}" && GIT_DIR=/dev/null node "${CHUNKER}" --dry-run`, {
    stdio: "inherit",
  });

  console.log("smart-chunker.smoke.js: PASS");
}

main();

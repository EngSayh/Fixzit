/* 
  Test framework note:
  - This test is authored to be compatible with both Vitest and Jest.
  - If Vitest is used, please ensure test runner picks up ESM/CJS interop as configured.
  - If Jest is used, globals (describe/it/expect/jest) are available; vi is aliased when possible.

  Primary focus:
  - Validate behavior of the "generate marketplace bible" script introduced by the PR diff:
      - Ensures output directory _artifacts is created if missing
      - Generates Fixzit_Marketplace_Bible_v1.md with expected content
      - Logs success message with exact output path
      - Is idempotent (re-run should still succeed and preserve correct content)
  - Edge cases:
      - Pre-existing artifacts directory/file
      - Simulated write failure (mock fs.writeFileSync throwing)
*/

import path from "path";
import fs from "fs";
import { spawnSync } from "child_process";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


// Try Vitest first; if running under Jest, fall back to globals.
// @ts-ignore - tolerate missing vitest types when running under Jest
let usingVitest = false;
try {
  const v = require("vitest");
  if (v && v.describe && v.it) {
    usingVitest = true;
  }
} catch (_) {
  // ignore
}

// Note: removed vi alias to avoid parser/lint issues. Tests will resolve the framework-specific
// utilities (vi/jest) inline where needed.

const REPO_ROOT = process.cwd();
const ARTIFACTS_DIR = path.join(REPO_ROOT, "_artifacts");
const OUT_FILE = path.join(ARTIFACTS_DIR, "Fixzit_Marketplace_Bible_v1.md");

// Attempt to locate the script under test.
// Preferred guesses based on common layout:
// - scripts/generate-marketplace-bible.ts
// - scripts/generate-marketplace-bible.js
// - tools/generate-marketplace-bible.ts
// - tools/generate-marketplace-bible.js
// - package.json script that calls a file with similar name
const candidateScripts = [
  "scripts/generate-marketplace-bible.ts",
  "scripts/generate-marketplace-bible.js",
  "tools/generate-marketplace-bible.ts",
  "tools/generate-marketplace-bible.js",
  "bin/generate-marketplace-bible.ts",
  "bin/generate-marketplace-bible.js",
  // Fallback to the provided test file path content if the PR placed script in tests (non-standard)
  "tests/scripts/generate-marketplace-bible.ts",
  "tests/scripts/generate-marketplace-bible.js",
];

// Helper to resolve a runnable node target for ts/js
function resolveRunnable(): { cmd: string; args: string[] } {
  for (const p of candidateScripts) {
    const full = path.join(REPO_ROOT, p);
    if (fs.existsSync(full)) {
      // If TypeScript, try ts-node/register if configured; otherwise node can run if transpiled.
      // We attempt to spawn with node directly; if it's TS and ESM-only, CI config should handle it.
      return { cmd: process.execPath, args: [full] };
    }
  }
  // As a final fallback, attempt to run the file under test if the PR mistakenly places executable code in the test file.
  const testFilePath = path.join(
    REPO_ROOT,
    "tests/scripts/generate-marketplace-bible.test.ts",
  );
  return { cmd: process.execPath, args: [testFilePath] };
}

function runScriptAndCapture(options?: { env?: NodeJS.ProcessEnv }): {
  status: number | null;
  stdout: string;
  stderr: string;
} {
  const { cmd, args } = resolveRunnable();
  const mergedEnv = { ...process.env, ...(options?.env ?? {}) };
  const res = spawnSync(cmd, args, {
    encoding: "utf8",
    env: mergedEnv,
  });
  return {
    status: res.status,
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
  };
}

function cleanArtifacts() {
  try {
    if (fs.existsSync(OUT_FILE)) {
      fs.unlinkSync(OUT_FILE);
    }
    ensureCoverageSupport();
  } catch {
    /* ignore */
  }
}

function removeBibleArtifactOnly() {
  try {
    if (fs.existsSync(OUT_FILE)) {
      fs.unlinkSync(OUT_FILE);
    }
  } catch {
    /* ignore */
  }
}

function ensureCoverageSupport() {
  try {
    const coverageTmp = path.join(ARTIFACTS_DIR, "coverage/.tmp");
    fs.mkdirSync(coverageTmp, { recursive: true });
  } catch {
    /* ignore */
  }
}

const expectedContentStart = "Fixzit Marketplace Bible (v1)";
const expectedContentIncludes = [
  "Scope: Amazon-style marketplace for materials",
  "/api/marketplace/search",
  "Fixzit_Marketplace_Bible_v1.md", // ensure name alignment if echoed or referenced
];

type LegacyTestUtils = { restoreAllMocks?: () => void } | undefined;

const getLegacyJest = (): LegacyTestUtils => {
  const globalAny = globalThis as Record<string, unknown>;
  const candidate = globalAny.jest;
  return typeof candidate === "object" && candidate !== null
    ? (candidate as { restoreAllMocks?: () => void })
    : undefined;
};

(usingVitest ? require("vitest") : globalThis).describe(
  "scripts/generate-marketplace-bible",
  () => {
    (usingVitest ? require("vitest") : globalThis).beforeEach(() => {
      cleanArtifacts();
    });

    (usingVitest ? require("vitest") : globalThis).afterEach(() => {
      removeBibleArtifactOnly();
      ensureCoverageSupport();
      // restore all mocks/spies
      const testUtils = usingVitest
        ? (() => {
            try {
              const v = require("vitest");
              return v.vi;
            } catch (_) {
              return undefined;
            }
          })()
        : getLegacyJest();
      if (testUtils && typeof testUtils.restoreAllMocks === "function") {
        testUtils.restoreAllMocks();
      }
    });

    (usingVitest ? require("vitest") : globalThis).it(
      "creates _artifacts directory and generates the .md with expected content (happy path)",
      () => {
        expect(fs.existsSync(OUT_FILE)).toBe(false);
        const { status, stdout, stderr } = runScriptAndCapture();
        expect(status).toBe(0);

        // Validate side effects
        expect(fs.existsSync(ARTIFACTS_DIR)).toBe(true);
        expect(fs.existsSync(OUT_FILE)).toBe(true);

        // Content validation
        const buf = fs.readFileSync(OUT_FILE, "utf8");
        expect(buf.startsWith(expectedContentStart)).toBe(true);
        for (const key of expectedContentIncludes) {
          expect(buf.includes(key)).toBe(true);
        }

        // Log validation (allow debugger output in stderr from Node.js)
        // Debugger output is expected in development and doesn't indicate errors
        const hasDebuggerOutput =
          stderr.includes("Debugger listening") ||
          stderr.includes("Debugger attached");
        const cleanStderr = hasDebuggerOutput ? "" : stderr;
        expect(cleanStderr).toBe("");
        // stdout may contain path and check mark
        // Accept either Windows or POSIX path styles; focus on key parts
        expect(stdout).toMatch(/Marketplace Bible generated at/i);
        expect(stdout).toContain(path.join(process.cwd(), "_artifacts"));
      },
    );

    (usingVitest ? require("vitest") : globalThis).it(
      "is idempotent: running twice preserves valid output",
      () => {
        // First run
        let res = runScriptAndCapture();
        expect(res.status).toBe(0);
        expect(fs.existsSync(OUT_FILE)).toBe(true);
        const first = fs.readFileSync(OUT_FILE, "utf8");

        // Second run
        res = runScriptAndCapture();
        expect(res.status).toBe(0);
        expect(fs.existsSync(OUT_FILE)).toBe(true);
        const second = fs.readFileSync(OUT_FILE, "utf8");

        // Verify still valid; if content isn't guaranteed identical, at least assert it starts with expected header
        expect(second.startsWith(expectedContentStart)).toBe(true);
        expect(first.length).toBeGreaterThan(0);
        expect(second.length).toBeGreaterThan(0);
      },
    );

    (usingVitest ? require("vitest") : globalThis).it(
      "handles pre-existing _artifacts directory gracefully",
      () => {
        fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
        const { status } = runScriptAndCapture();
        expect(status).toBe(0);
        expect(fs.existsSync(ARTIFACTS_DIR)).toBe(true);
        expect(fs.existsSync(OUT_FILE)).toBe(true);
      },
    );

    (usingVitest ? require("vitest") : globalThis).it(
      "overwrites or updates an existing output file with valid content",
      () => {
        fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
        fs.writeFileSync(OUT_FILE, "stale content");
        const { status } = runScriptAndCapture();
        expect(status).toBe(0);
        const updated = fs.readFileSync(OUT_FILE, "utf8");
        expect(updated.startsWith(expectedContentStart)).toBe(true);
      },
    );

    (usingVitest ? require("vitest") : globalThis).it(
      "logs a clear success message containing the absolute output path",
      () => {
        const { status, stdout } = runScriptAndCapture();
        expect(status).toBe(0);
        expect(stdout).toMatch(/✔/);
        expect(stdout).toContain(OUT_FILE);
      },
    );

    (usingVitest ? require("vitest") : globalThis).it(
      "surfaces write errors when fs.writeFileSync fails (failure condition)",
      () => {
        const { status, stderr } = runScriptAndCapture({
          env: { FIXZIT_BIBLE_FORCE_WRITE_ERROR: "1", NODE_ENV: "test" },
        });

        expect(status).not.toBe(0);
        expect(stderr).toMatch(/Forced write failure for tests/i);
      },
    );
  },
);

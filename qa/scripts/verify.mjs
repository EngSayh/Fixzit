import { spawn } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";
import pc from "picocolors";
import { cfg } from "../config.js";
import { once } from "node:events";
import http from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Default to fast mode to avoid collecting every page locally. Set VERIFY_FULL=true or pass --full to run full E2E.
const FAST = process.env.VERIFY_FULL !== "true" ? true : false;

async function ping(url, attempts = 30) {
  for (let i = 0; i < attempts; i++) {
    const ok = await new Promise((r) => {
      const req = http.get(url, (res) => {
        res.resume();
        r(res.statusCode < 500);
      });
      req.on("error", () => r(false));
    });
    if (ok) return true;
    await wait(1000);
  }
  return false;
}

async function run(cmd, args, name, { timeoutSec = 60 } = {}) {
  return new Promise((resolve, reject) => {
    // Spawn with pipes so we can observe output for the watchdog, but forward output to the parent
    const p = spawn(cmd, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    // Forward child output to the parent so logs are visible
    p.stdout && p.stdout.pipe(process.stdout);
    p.stderr && p.stderr.pipe(process.stderr);

    // Watchdog: if child doesn't exit or produce output for `timeoutSec`, kill it
    let lastOutput = Date.now();
    const watchdog = setInterval(() => {
      if (Date.now() - lastOutput > timeoutSec * 1000) {
        try {
          p.kill("SIGKILL");
        } catch (e) {}
        clearInterval(watchdog);
        reject(
          new Error(
            `${name} hung for >${timeoutSec}s and was killed by watchdog`,
          ),
        );
      }
    }, 2000);

    p.stdout?.on("data", () => (lastOutput = Date.now()));
    p.stderr?.on("data", () => (lastOutput = Date.now()));

    p.on("exit", (code) => {
      clearInterval(watchdog);
      code === 0 ? resolve() : reject(new Error(`${name} failed (${code})`));
    });
    p.on("error", (err) => {
      clearInterval(watchdog);
      reject(err);
    });
  });
}

async function main() {
  console.log(
    pc.cyan("▶ Fixzit QA — Halt–Fix–Verify runner (localhost:3000)"),
  );
  // 1) DB sanity
  await run("node", ["qa/scripts/dbConnectivity.mjs"], "DB connectivity");

  // 2) Start dev server (only for full verify)
  let dev;
  if (!FAST) {
    dev = spawn(
      process.platform === "win32" ? "npm.cmd" : "npm",
      ["run", "dev"],
      { stdio: ["ignore", "pipe", "pipe"], env: process.env },
    );
    dev.stdout && dev.stdout.pipe(process.stdout);
    dev.stderr && dev.stderr.pipe(process.stderr);
    console.log(pc.gray("… waiting for Next.js to boot on 3000"));
    const up = await ping(cfg.baseURL, 30);
    if (!up) {
      try {
        dev.kill();
      } catch (e) {}
      throw new Error("Server did not start on 3000");
    }
  } else {
    console.log(
      pc.gray(
        "… FAST verify selected — skipping full dev server boot (set VERIFY_FULL=true to run full)",
      ),
    );
  }

  try {
    // 3) Optional seed (idempotent)
    await run("node", ["qa/scripts/seed.mjs"], "Seed");

    // 4) Scans (placeholders + duplicates)
    await run("node", ["qa/scripts/scanPlaceholders.mjs"], "Placeholder scan");
    await run("node", ["qa/scripts/scanDuplicates.mjs"], "Duplicate scan");

    // 5) E2E (Playwright) — full or fast
    const pwArgs = FAST ? ["-g", "@smoke"] : [];
    await run("bash", ["scripts/run-playwright.sh", ...pwArgs], "E2E");
  } finally {
    if (dev) {
      try {
        dev.kill();
      } catch (e) {
        // Process may have already exited - log if kill failed for debugging
        console.log(
          pc.gray(`ℹ Dev server cleanup: ${e.message || "already exited"}`),
        );
      }
    }
  }

  console.log(
    pc.green("✔ All QA checks completed. Artifacts in qa/artifacts."),
  );
}

main().catch((e) => {
  console.error(pc.red(e.message));
  process.exit(1);
});

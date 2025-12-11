#!/usr/bin/env tsx
/**
 * Generate an HMAC SHA-256 signature for Tap webhook testing.
 *
 * Examples:
 *   pnpm tsx scripts/sign-tap-payload.ts --file payload.json
 *   pnpm tsx scripts/sign-tap-payload.ts --json '{"id":"chg_123","object":"charge"}'
 *   echo '{"id":"chg_123"}' | pnpm tsx scripts/sign-tap-payload.ts
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { config as loadEnv } from "dotenv";

type CliOptions = {
  file?: string;
  json?: string;
  env?: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function parseArgs(): CliOptions {
  const opts: CliOptions = {};
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--file" || arg === "-f") {
      opts.file = args[++i];
    } else if (arg === "--json") {
      opts.json = args[++i];
    } else if (arg === "--env") {
      opts.env = args[++i];
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      console.warn(`⚠️  Unknown option: ${arg}`);
    }
  }

  return opts;
}

function printHelp(): void {
  console.log(`Usage: pnpm tsx scripts/sign-tap-payload.ts [options]

Options:
  --file, -f <path>   Read payload JSON from file
  --json <string>     Inline JSON payload (single line)
  --env <path>        Optional env file (default: .env.local)
  --help, -h          Show this help message

Notes:
  • The signature is calculated on the raw payload string. If you pretty-print the JSON,
    be sure to reuse the exact same bytes in your curl command.
`);
}

function readStdIn(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

async function main() {
  const opts = parseArgs();
  const envPath = path.resolve(projectRoot, opts.env ?? ".env.local");

  if (fs.existsSync(envPath)) {
    loadEnv({ path: envPath });
  } else {
    console.warn(
      `⚠️  Env file not found at ${envPath}. Using current environment variables.`,
    );
  }

  // Use standardized env vars: prefer live key if TAP_ENVIRONMENT=live, otherwise test
  const isProd = process.env.TAP_ENVIRONMENT === "live" || process.env.NODE_ENV === "production";
  const secret = isProd 
    ? process.env.TAP_LIVE_SECRET_KEY 
    : process.env.TAP_TEST_SECRET_KEY;
  
  if (!secret) {
    const keyName = isProd ? "TAP_LIVE_SECRET_KEY" : "TAP_TEST_SECRET_KEY";
    console.error(`❌ ${keyName} is not set. Cannot generate signature.`);
    console.error(`   Current environment: ${isProd ? "live" : "test"}`);
    process.exit(1);
  }

  const rawPayload =
    opts.json ??
    (opts.file
      ? fs.readFileSync(path.resolve(process.cwd(), opts.file), "utf8")
      : (await readStdIn()).trim());

  if (!rawPayload) {
    console.error(
      "❌ No payload provided. Pass --file, --json, or pipe JSON via STDIN.",
    );
    process.exit(1);
  }

  // Validate JSON structure but keep the raw bytes for hashing
  try {
    const parsed = JSON.parse(rawPayload);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Payload must be a JSON object");
    }
  } catch (error) {
    console.error(
      `❌ Failed to parse JSON payload: ${(error as Error).message}`,
    );
    process.exit(1);
  }

  const signature = crypto
    .createHmac("sha256", secret)
    .update(rawPayload)
    .digest("hex");

  console.log("✅ Tap signature generated");
  console.log("");
  console.log(`X-Tap-Signature: ${signature}`);
  console.log("");
  console.log("Curl example:");
  console.log(`RAW_PAYLOAD='${rawPayload}'`);
  console.log(`curl -X POST http://localhost:3000/api/payments/tap/webhook \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -H "X-Tap-Signature: ${signature}" \\`);
  console.log(`  -d "$RAW_PAYLOAD"`);
}

main().catch((error) => {
  console.error("❌ Unexpected error while generating Tap signature:", error);
  process.exit(1);
});

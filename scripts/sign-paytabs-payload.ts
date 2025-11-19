#!/usr/bin/env tsx
/**
 * Generate a PayTabs callback signature for manual testing.
 *
 * Usage examples:
 *   pnpm tsx scripts/sign-paytabs-payload.ts --file payload.json
 *   echo '{"tran_ref":"T1"}' | pnpm tsx scripts/sign-paytabs-payload.ts
 *   pnpm tsx scripts/sign-paytabs-payload.ts --json '{"tran_ref":"T2"}'
 *
 * The script loads PAYTABS_* secrets from .env.local by default.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { generateCallbackSignature } from '../lib/paytabs';

type CliOptions = {
  file?: string;
  env?: string;
  json?: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function parseArgs(): CliOptions {
  const opts: CliOptions = {};
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--file' || arg === '-f') {
      opts.file = args[++i];
    } else if (arg === '--env') {
      opts.env = args[++i];
    } else if (arg === '--json') {
      opts.json = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      console.warn(`⚠️  Unknown option: ${arg}`);
    }
  }

  return opts;
}

function printHelp(): void {
  console.log(`Usage: pnpm tsx scripts/sign-paytabs-payload.ts [options]

Options:
  --file, -f <path>   Path to JSON file containing the payload
  --json <string>     Inline JSON payload
  --env <path>        Optional env file (default: .env.local)
  --help, -h          Show this help message

Examples:
  pnpm tsx scripts/sign-paytabs-payload.ts --file payload.json
  echo '{"tran_ref":"T1"}' | pnpm tsx scripts/sign-paytabs-payload.ts
`);
}

function readStdIn(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

async function main() {
  const opts = parseArgs();
  const envPath = path.resolve(projectRoot, opts.env ?? '.env.local');

  if (fs.existsSync(envPath)) {
    loadEnv({ path: envPath });
  } else {
    console.warn(`⚠️  Env file not found at ${envPath}. Using current environment variables.`);
  }

  const serverKey = process.env.PAYTABS_API_SERVER_KEY || process.env.PAYTABS_SERVER_KEY;
  if (!serverKey) {
    console.error('❌ PAYTABS_SERVER_KEY (or PAYTABS_API_SERVER_KEY) is not set. Cannot generate signature.');
    process.exit(1);
  }

  // Ensure the selected key is available to generateCallbackSignature
  process.env.PAYTABS_SERVER_KEY = serverKey;

  const rawPayload =
    opts.json ??
    (opts.file
      ? fs.readFileSync(path.resolve(process.cwd(), opts.file), 'utf8')
      : (await readStdIn()).trim());

  if (!rawPayload) {
    console.error('❌ No payload provided. Pass --file, --json, or pipe JSON via STDIN.');
    process.exit(1);
  }

  let payload: Record<string, unknown>;
  try {
    const parsed = JSON.parse(rawPayload);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Payload must be a JSON object');
    }
    payload = parsed as Record<string, unknown>;
  } catch (error) {
    console.error(`❌ Failed to parse JSON payload: ${(error as Error).message}`);
    process.exit(1);
  }

  const signature = generateCallbackSignature(payload);

  console.log('✅ Signature generated');
  console.log('');
  console.log(`signature header : ${signature}`);
  console.log('');
  console.log('Curl example:');
  console.log(`curl -X POST http://localhost:3000/api/paytabs/callback \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -H "signature: ${signature}" \\`);
  console.log(`  -d '${JSON.stringify(payload)}'`);
}

main().catch(error => {
  console.error('❌ Unexpected error while generating signature:', error);
  process.exit(1);
});

#!/usr/bin/env tsx
/**
 * create-file.ts - Reliable file creation utility
 */
import fs from "fs";
import path from "path";

interface Options {
  filePath: string;
  content: string;
  encoding: BufferEncoding;
  overwrite: boolean;
  backup: boolean;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    filePath: "",
    content: "",
    encoding: "utf8",
    overwrite: false,
    backup: false,
    dryRun: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];

    if (arg === "--path" || arg === "--file") opts.filePath = String(next());
    else if (arg === "--content") opts.content = String(next());
    else if (arg === "--encoding")
      opts.encoding = String(next()) as BufferEncoding;
    else if (arg === "--overwrite") opts.overwrite = true;
    else if (arg === "--backup") opts.backup = true;
    else if (arg === "--dry-run") opts.dryRun = true;
    else if (!arg.startsWith("--") && !opts.filePath) opts.filePath = arg;
  }

  if (!opts.filePath) throw new Error("--path required");
  return opts;
}

async function run() {
  const opts = parseArgs(process.argv);
  interface RunResult {
    success: boolean;
    filePath: string;
    message?: string;
    backupPath?: string;
    bytesWritten?: number;
  }

  const result: RunResult = { success: false, filePath: opts.filePath };

  try {
    const exists = fs.existsSync(opts.filePath);

    if (exists && !opts.overwrite) {
      result.message = "File exists. Use --overwrite";
      console.log(JSON.stringify(result));
      process.exitCode = 1;
      return;
    }

    if (opts.dryRun) {
      result.message = "Dry-run: would create file";
      result.success = true;
      console.log(JSON.stringify(result));
      return;
    }

    if (exists && opts.backup) {
      fs.copyFileSync(opts.filePath, opts.filePath + ".bak");
      result.backupPath = opts.filePath + ".bak";
    }

    fs.mkdirSync(path.dirname(opts.filePath), { recursive: true });
    fs.writeFileSync(opts.filePath, opts.content, { encoding: opts.encoding });

    result.success = true;
    result.bytesWritten = opts.content.length;
    result.message = exists ? "File overwritten" : "File created";
    console.log(JSON.stringify(result, null, 2));
  } catch (err: unknown) {
    const error = err as { message?: string };
    result.message = error?.message || String(err);
    console.error(result.message);
    process.exitCode = 1;
    console.log(JSON.stringify(result));
  }
}

run();

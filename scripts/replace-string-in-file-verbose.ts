#!/usr/bin/env tsx
/**
 * replace-string-in-file-verbose.ts
 *
 * VERBOSE VERSION with detailed logging to debug write issues
 */

import fg from "fast-glob";
import fs from "fs";
import path from "path";

interface Options {
  paths: string[];
  search: string;
  replace: string;
  regex: boolean;
  flags?: string;
  wordMatch: boolean;
  encoding: BufferEncoding;
  backup: boolean;
  dryRun: boolean;
  includeDot: boolean;
  autoUnescape: boolean;
}

interface FileResult {
  file: string;
  matched: boolean;
  replaced: number;
  skipped?: string;
  backupPath?: string;
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    paths: [],
    search: "",
    replace: "",
    regex: false,
    flags: undefined,
    wordMatch: false,
    encoding: "utf8",
    backup: false,
    dryRun: false,
    includeDot: false,
    autoUnescape: true,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    switch (arg) {
      case "--path":
        opts.paths.push(String(next() ?? ""));
        break;
      case "--search":
        opts.search = String(next() ?? "");
        break;
      case "--replace":
        opts.replace = String(next() ?? "");
        break;
      case "--regex":
        opts.regex = true;
        break;
      case "--flags":
        opts.flags = String(next() ?? "");
        break;
      case "--word-match":
      case "--wordMatch":
        opts.wordMatch = true;
        break;
      case "--encoding":
        opts.encoding = String(next() ?? "utf8") as BufferEncoding;
        break;
      case "--backup":
        opts.backup = true;
        break;
      case "--dry-run":
      case "--dryRun":
        opts.dryRun = true;
        break;
      case "--include-dot":
      case "--includeDot":
        opts.includeDot = true;
        break;
      case "--no-auto-unescape":
      case "--noAutoUnescape":
        opts.autoUnescape = false;
        break;
      default:
        if (arg.startsWith("--")) {
          // ignore unknown flags
        } else {
          opts.paths.push(arg);
        }
        break;
    }
  }

  if (opts.paths.length === 0) throw new Error("--path is required");
  if (!opts.search) throw new Error("--search is required");
  if (opts.regex && !opts.flags) {
    opts.flags = "g";
  }
  if (!opts.regex && opts.flags && !opts.flags.includes("g")) {
    opts.flags = `${opts.flags}g`;
  }
  return opts;
}

function escapeRegExp(literal: string) {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function autoUnescapeRegex(str: string): string {
  return str.replace(/\\\\([dDwWsSnrtfvbB0(){}[\].+*?^$|\\])/g, "\\$1");
}

function buildPattern(opts: Options): RegExp {
  if (opts.regex) {
    const source = opts.autoUnescape
      ? autoUnescapeRegex(opts.search)
      : opts.search;
    try {
      return new RegExp(source, opts.flags);
    } catch (err: unknown) {
      const error = err as { message?: string };
      throw new Error(
        `Invalid regex pattern: ${source}. Original: ${opts.search}. Error: ${error.message || String(err)}`,
      );
    }
  }
  const base = escapeRegExp(opts.search);
  const src = opts.wordMatch ? `\\b${base}\\b` : base;
  const flags = opts.flags || "g";
  return new RegExp(src, flags);
}

function ensureParentDir(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function createBackup(filePath: string): string {
  const backupPath = `${filePath}.bak`;
  ensureParentDir(backupPath);
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
  }
  return backupPath;
}

function replaceInContent(
  content: string,
  pattern: RegExp,
  replacement: string,
): { result: string; count: number } {
  const matches = content.match(pattern);
  const count = matches ? matches.length : 0;
  const result = count > 0 ? content.replace(pattern, replacement) : content;
  return { result, count };
}

async function run() {
  console.error("🔍 VERBOSE MODE - Detailed logging enabled");
  console.error("");

  const opts = parseArgs(process.argv);
  console.error("📋 Options:", JSON.stringify(opts, null, 2));
  console.error("");

  const pattern = buildPattern(opts);
  console.error("🎯 Pattern:", pattern);
  console.error("");

  const files = new Set<string>();
  for (const p of opts.paths) {
    console.error(`🔎 Searching for files matching: ${p}`);
    const matches = await fg(p, {
      dot: opts.includeDot,
      onlyFiles: true,
      unique: true,
      ignore: [
        "**/node_modules/**",
        "**/.git/**",
        "**/.next/**",
        "**/dist/**",
        "**/build/**",
      ],
    });
    console.error(`   Found ${matches.length} file(s)`);
    for (const m of matches) files.add(m);
  }
  console.error("");

  if (files.size === 0) {
    const msg = `No files matched for patterns: ${opts.paths.join(", ")}`;
    console.error(`❌ ${msg}`);
    process.exitCode = 2;
    console.log(
      JSON.stringify({
        success: false,
        message: msg,
        totalFiles: 0,
        totalReplacements: 0,
      }),
    );
    return;
  }

  console.error(`📁 Processing ${files.size} file(s)...`);
  console.error("");

  const results: FileResult[] = [];
  let totalReplacements = 0;
  let fileErrors = 0;

  for (const file of files) {
    console.error(`📄 File: ${file}`);
    try {
      console.error(`   📖 Reading file...`);
      const original = fs.readFileSync(file, { encoding: opts.encoding });
      console.error(`   📏 Original size: ${original.length} bytes`);
      console.error(`   🔍 Searching for pattern...`);

      const { result, count } = replaceInContent(
        original,
        pattern,
        opts.replace,
      );
      console.error(`   ✨ Found ${count} match(es)`);

      if (count === 0) {
        console.error(`   ⏭️  Skipping (no matches)`);
        results.push({
          file,
          matched: true,
          replaced: 0,
          skipped: "no matches",
        });
        console.error("");
        continue;
      }

      console.error(`   📏 New size: ${result.length} bytes`);
      console.error(
        `   📊 Size change: ${result.length - original.length} bytes`,
      );

      let backupPath: string | undefined;
      if (opts.backup && !opts.dryRun) {
        console.error(`   💾 Creating backup...`);
        backupPath = createBackup(file);
        console.error(`   ✅ Backup created: ${backupPath}`);
      }

      if (!opts.dryRun) {
        console.error(`   ✍️  Writing to disk...`);
        const beforeWrite = Date.now();
        fs.writeFileSync(file, result, { encoding: opts.encoding });
        const afterWrite = Date.now();
        console.error(`   ✅ Write completed in ${afterWrite - beforeWrite}ms`);

        // Verify write
        const verification = fs.readFileSync(file, { encoding: opts.encoding });
        if (verification === result) {
          console.error(`   ✅ Write verified - content matches`);
        } else {
          console.error(`   ⚠️  WARNING: Write verification failed!`);
          console.error(`      Expected length: ${result.length}`);
          console.error(`      Actual length: ${verification.length}`);
        }
      } else {
        console.error(`   🏃 DRY-RUN: Skipping write`);
      }

      totalReplacements += count;
      results.push({
        file,
        matched: true,
        replaced: count,
        ...(backupPath ? { backupPath } : {}),
      });
    } catch (err: unknown) {
      const error = err as { message?: string };
      console.error(`   ❌ ERROR: ${error.message || String(err)}`);
      fileErrors++;
      results.push({
        file,
        matched: false,
        replaced: 0,
        skipped: error?.message || String(err),
      });
    }
    console.error("");
  }

  const success = totalReplacements > 0 && fileErrors === 0;
  const message = opts.dryRun
    ? `Dry-run complete. ${totalReplacements} replacement(s) would be made across ${files.size} file(s).`
    : totalReplacements === 0
      ? `No matches found. 0 replacements across ${files.size} file(s).`
      : fileErrors > 0
        ? `Completed with ${totalReplacements} replacement(s), but ${fileErrors} file(s) had errors.`
        : `Completed with ${totalReplacements} replacement(s) across ${files.size} file(s).`;

  console.error("📊 SUMMARY:");
  console.error(`   Success: ${success}`);
  console.error(`   Total files: ${files.size}`);
  console.error(`   Total replacements: ${totalReplacements}`);
  console.error(`   Errors: ${fileErrors}`);
  console.error("");

  const summary = {
    success,
    message,
    totalFiles: files.size,
    totalReplacements,
    dryRun: opts.dryRun,
    backup: opts.backup,
    regex: opts.regex,
    wordMatch: opts.wordMatch,
    includeDot: opts.includeDot,
    autoUnescape: opts.autoUnescape,
    details: results,
  };

  console.log(JSON.stringify(summary, null, 2));
}

run().catch((err) => {
  const msg = err?.message || String(err);
  console.error(`💥 FATAL ERROR: ${msg}`);
  console.error(err.stack);
  process.exitCode = 1;
  console.log(JSON.stringify({ success: false, message: msg }));
});

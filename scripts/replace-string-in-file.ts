#!/usr/bin/env tsx
/**
 * replace-string-in-file.ts
 *
 * Reliable, cross-platform "replace string in file" utility.
 * - Supports literal or regex search
 * - Supports glob patterns for --path (repeatable)
 * - Optional word boundary matching for literal search
 * - Optional backup creation and dry-run mode
 * - Reports per-file and total replacements, success=false if nothing changed
 * - Optional auto-unescape for regex patterns to mitigate shell escaping
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
  autoUnescape: boolean; // auto-unescape double-escaped regex sequences
}

interface FileResult {
  file: string;
  matched: boolean; // pattern compiled and file processed
  replaced: number; // number of replacements in this file
  skipped?: string; // reason if skipped
  backupPath?: string; // path to backup if created
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
          // ignore unknown flags to be forward-compatible
        } else {
          // positional treated as path
          opts.paths.push(arg);
        }
        break;
    }
  }

  if (opts.paths.length === 0)
    throw new Error("--path is required (can be repeated or a glob)");
  if (!opts.search) throw new Error("--search is required");
  if (opts.regex && !opts.flags) {
    // default to global replace if not provided
    opts.flags = "g";
  }
  if (!opts.regex && opts.flags && !opts.flags.includes("g")) {
    // ensure global by default for literal search
    opts.flags = `${opts.flags}g`;
  }
  return opts;
}

function escapeRegExp(literal: string) {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function autoUnescapeRegex(str: string): string {
  // Convert common double-escaped sequences to single escaped.
  // Example: "foo\\(\\d+\\)" -> "foo\(\d+\)"
  // We only touch sequences starting with \\ followed by typical regex escape letters/symbols.
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
  // Do not overwrite an existing backup
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
  // Count matches first so that string replacement can still expand $1, $2 etc.
  const matches = content.match(pattern);
  const count = matches ? matches.length : 0;
  const result = count > 0 ? content.replace(pattern, replacement) : content;
  return { result, count };
}

async function run() {
  const opts = parseArgs(process.argv);
  const pattern = buildPattern(opts);

  const files = new Set<string>();
  for (const p of opts.paths) {
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
    for (const m of matches) files.add(m);
  }

  if (files.size === 0) {
    const msg = `No files matched for patterns: ${opts.paths.join(", ")}`;
    console.error(msg);
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

  const results: FileResult[] = [];
  let totalReplacements = 0;
  let fileErrors = 0;

  for (const file of files) {
    try {
      const original = fs.readFileSync(file, { encoding: opts.encoding });
      const { result, count } = replaceInContent(
        original,
        pattern,
        opts.replace,
      );

      if (count === 0) {
        results.push({
          file,
          matched: true,
          replaced: 0,
          skipped: "no matches",
        });
        continue;
      }

      let backupPath: string | undefined;
      if (opts.backup && !opts.dryRun) {
        backupPath = createBackup(file);
      }

      if (!opts.dryRun) {
        fs.writeFileSync(file, result, { encoding: opts.encoding });
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
      fileErrors++;
      results.push({
        file,
        matched: false,
        replaced: 0,
        skipped: error?.message || String(err),
      });
    }
  }

  const success = totalReplacements > 0 && fileErrors === 0;
  const message = opts.dryRun
    ? `Dry-run complete. ${totalReplacements} replacement(s) would be made across ${files.size} file(s).`
    : totalReplacements === 0
      ? `No matches found. 0 replacements across ${files.size} file(s).`
      : fileErrors > 0
        ? `Completed with ${totalReplacements} replacement(s), but ${fileErrors} file(s) had errors.`
        : `Completed with ${totalReplacements} replacement(s) across ${files.size} file(s).`;

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
  console.error(msg);
  process.exitCode = 1;
  console.log(JSON.stringify({ success: false, message: msg }));
});

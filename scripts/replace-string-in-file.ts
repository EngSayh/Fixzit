#!/usr/bin/env tsx
/**
 * replace-string-in-file.ts
 *
 * Reliable, cross-platform "replace string in file" utility.
 * - Supports literal or regex search
 * - Supports glob patterns for --path (repeatable)
 * - Optional word boundary matching for literal search
 * - Optional backup creation and dry-run mode
 * - Reports per-file and total replacements
 *
 * Usage examples:
 *   Literal search (global) across a glob
 *   npx tsx scripts/replace-string-in-file.ts --path "src/star-star/star.ts" --search "old()" --replace "new()"
 *
 *   Regex search with flags
 *   npx tsx scripts/replace-string-in-file.ts --path "src/star-star/star.ts" --regex --flags "gi" --search "foo\\(\\d+\\)" --replace "bar($1)"
 *
 *   Literal whole-word match with backup and dry-run
 *   npx tsx scripts/replace-string-in-file.ts --path README.md --search "Fixzit" --replace "FixZit" --word-match --backup --dry-run
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
  searchFile?: string;
  replaceFile?: string;
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

  if (opts.paths.length === 0) throw new Error("--path is required (can be repeated or a glob)");
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

function normalizeRegexPattern(str: string): string {
  // Intelligently handle shell escaping for regex patterns
  // The goal: make it work regardless of how the user escapes it
  
  // If the pattern has double backslashes (shell escaped), convert to single
  // \\d -> \d, \\( -> \(, etc.
  let normalized = str.replace(/\\\\([dDwWsSnrtfvbB0])/g, '\\$1');  // Character classes
  normalized = normalized.replace(/\\\\([()[\]{}.*+?^$|\\])/g, '\\$1');  // Special chars
  
  // Handle cases where user might have typed literal backslash-backslash
  // If we see \\\\ (4 backslashes), it should become \\ (2 backslashes)
  normalized = normalized.replace(/\\\\\\\\/g, '\\\\');
  
  return normalized;
}

function normalizeReplacementString(str: string): string {
  // Handle replacement string escaping
  // The replacement string should preserve $1, $2, etc. for capture groups
  // Only unescape if the user double-escaped it
  
  // If we see \\$1 (escaped dollar), convert to $1
  // But $1 should stay as $1 (it's already correct for capture groups)
  let normalized = str.replace(/\\\\\\\\\$/g, '$');  // \\\\\$ -> $
  
  return normalized;
}

function buildPattern(opts: Options): RegExp {
  if (opts.regex) {
    // Normalize the pattern to handle various shell escaping scenarios
    const pattern = normalizeRegexPattern(opts.search);
    try {
      return new RegExp(pattern, opts.flags);
    } catch (err: any) {
      throw new Error(`Invalid regex pattern: ${pattern}. Original: ${opts.search}. Error: ${err.message}`);
    }
  }
  const base = escapeRegExp(opts.search);
  const src = opts.wordMatch ? `\\b${base}\\b` : base;
  const flags = opts.flags || "g";
  return new RegExp(src, flags);
}

function ensureDir(p: string) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
}

function createBackup(filePath: string): string {
  const backupPath = `${filePath}.bak`;
  ensureDir(backupPath);
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

function replaceInContent(content: string, pattern: RegExp, replacement: string): { result: string; count: number } {
  // Count matches first so that string replacement can still expand $1, $2 etc.
  const matches = content.match(pattern);
  const count = matches ? matches.length : 0;
  const result = count > 0 ? content.replace(pattern, replacement) : content;
  return { result, count };
}

async function run() {
  const opts = parseArgs(process.argv);
  const pattern = buildPattern(opts);
  
  // Normalize replacement string if using regex mode
  const replacement = opts.regex ? normalizeReplacementString(opts.replace) : opts.replace;

  const files = new Set<string>();
  for (const p of opts.paths) {
    const matches = await fg(p, { dot: true, onlyFiles: true, unique: true });
    for (const m of matches) files.add(m);
  }

  if (files.size === 0) {
    const msg = `No files matched for patterns: ${opts.paths.join(", ")}`;
    console.error(msg);
    process.exitCode = 2;
    console.log(JSON.stringify({ success: false, message: msg, totalFiles: 0, totalReplacements: 0 }));
    return;
  }

  const results: FileResult[] = [];
  let totalReplacements = 0;

  for (const file of files) {
    try {
      const original = fs.readFileSync(file, { encoding: opts.encoding });
      const { result, count } = replaceInContent(original, pattern, replacement);

      if (count === 0) {
        results.push({ file, matched: true, replaced: 0, skipped: "no matches" });
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
      results.push({ file, matched: true, replaced: count, ...(backupPath ? { backupPath } : {}) });
    } catch (err: any) {
      results.push({ file, matched: false, replaced: 0, skipped: err?.message || String(err) });
    }
  }

  const summary = {
    success: true,
    message: opts.dryRun
      ? `Dry-run complete. ${totalReplacements} replacement(s) would be made across ${files.size} file(s).`
      : `Completed with ${totalReplacements} replacement(s) across ${files.size} file(s).`,
    totalFiles: files.size,
    totalReplacements,
    dryRun: opts.dryRun,
    backup: opts.backup,
    regex: opts.regex,
    wordMatch: opts.wordMatch,
    details: results,
  };

  // Print as JSON for machine readability
  console.log(JSON.stringify(summary, null, 2));
}

run().catch((err) => {
  const msg = err?.message || String(err);
  console.error(msg);
  process.exitCode = 1;
  console.log(JSON.stringify({ success: false, message: msg }));
});

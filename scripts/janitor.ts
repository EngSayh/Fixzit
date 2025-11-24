// scripts/janitor.ts
// Moves root junk files into _archive/<timestamp>/ to keep the repo clean.
// Usage: npm run clean:root  (maps to: tsx scripts/janitor.ts --apply)

import { mkdirSync, renameSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";

const NOW = new Date().toISOString().replace(/[:T]/g, "-").split(".")[0];
const ARCHIVE_DIR = `_archive/${NOW}`;
const ROOT = process.cwd();

const MOVE_PATTERNS = [
  /\.zip$/i,
  /\.tar(\.gz)?$/i,
  /\.tgz$/i,
  /\.gz$/i,
  /\.log$/i,
  /\.tmp$/i,
  /\.bak$/i,
  /\s(\d+)\./, // duplicates like "config (2).zip"
];

const ENV_KEEP = new Set([".env.local", "env.example"]);

function shouldMove(file: string) {
  // don't touch directories
  const stat = statSync(join(ROOT, file));
  if (!stat.isFile()) return false;

  // keep key project files
  if (
    [
      "package.json",
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      "next.config.js",
      "postcss.config.js",
      "tailwind.config.js",
      "README.md",
    ].includes(file)
  ) {
    return false;
  }

  // keep main envs
  if (
    (file.startsWith(".env") || file.startsWith("env")) &&
    ENV_KEEP.has(file)
  ) {
    return false;
  }

  // move other env variations
  if (file.startsWith(".env") || file.startsWith("env")) return true;

  // move matching junk
  return MOVE_PATTERNS.some((re) => re.test(file));
}

function main() {
  const entries = readdirSync(ROOT);
  const toMove = entries.filter(shouldMove);

  if (!toMove.length) {
    console.log("Nothing to move. Root is clean ✅");
    return;
  }
  if (!existsSync(ARCHIVE_DIR)) mkdirSync(ARCHIVE_DIR, { recursive: true });

  for (const f of toMove) {
    const src = join(ROOT, f);
    const dst = join(ROOT, ARCHIVE_DIR, f);
    try {
      renameSync(src, dst);
      console.log(`Moved: ${f} -> ${ARCHIVE_DIR}/`);
    } catch (e) {
      console.warn(`Skip (could not move): ${f}`, e);
    }
  }
  console.log(`\nDone. Moved ${toMove.length} file(s) into ${ARCHIVE_DIR}`);
}

main();

import fs from "node:fs";
import path from "node:path";

/**
 * Pragmatic extractor:
 * - Scans .ts/.tsx/.js/.jsx for role guards like authorize("ROLE") or requireRole("ROLE")
 * - Attempts to infer a route string in the same file (heuristic)
 * Adjust ROLE_PATTERNS to match your auth helpers (e.g., hasRole, can, policy).
 */
const ROOTS = ["apps", "packages", "src"].filter((p) => {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
});
const SKIP_DIRS = new Set([
  ".git",
  ".next",
  ".artifacts",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".vercel",
  "lhci_reports"
]);
const SKIP_DIRS = new Set([
  ".git",
  ".next",
  ".artifacts",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".vercel",
  "lhci_reports"
]);
const ROLE_PATTERNS = [
  /authorize\(["'`](.+?)["'`]\)/g,
  /requireRole\(["'`](.+?)["'`]\)/g,
  /hasRole\(["'`](.+?)["'`]\)/g
];
const ROUTE_REGEX = /(?:GET|POST|PUT|PATCH|DELETE)\s+['"`]([^'"`]+)['"`]/i;

const rows = [["role", "file", "route_or_context", "action"]];

function scanFile(p) {
  try {
    const src = fs.readFileSync(p, "utf8");
    const matches = ROLE_PATTERNS.flatMap((regex) => [...src.matchAll(regex)].map((m) => m[1]));
    if (matches.length === 0) return;
    const route = src.match(ROUTE_REGEX)?.[1] || "";
    matches.forEach((role) => rows.push([role, p, route, "allow"]));
  } catch (err) {
    console.warn(`[rbac] skipping unreadable file: ${p} (${err.code ?? err.message})`);
  }
}

function walk(dir) {
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name) || e.name.startsWith(".")) continue;
        walk(p);
      } else if (e.isFile() && /\.(ts|tsx|js|jsx)$/.test(p)) {
        scanFile(p);
      }
    }
  } catch (err) {
    console.warn(`[rbac] skipping unreadable directory: ${dir} (${err.code ?? err.message})`);
  }
}
ROOTS.forEach(walk);

function escapeCsvField(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function toCsvRow(row) {
  return row.map(escapeCsvField).join(",");
}

const csvLines = rows.map(toCsvRow);
const csv = csvLines.join("\n");
fs.writeFileSync("rbac-matrix.csv", csv);
console.log(`[rbac] exported ${rows.length - 1} entries to rbac-matrix.csv`);

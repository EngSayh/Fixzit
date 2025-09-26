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
const ROLE_PATTERNS = [
  /authorize\(["'`](.+?)["'`]\)/g,
  /requireRole\(["'`](.+?)["'`]\)/g,
  /hasRole\(["'`](.+?)["'`]\)/g
];
const ROUTE_REGEX = /(?:GET|POST|PUT|PATCH|DELETE)\s+['"`]([^'"`]+)['"`]/i;

const rows = [["role","file","route_or_context","action"]];

function scanFile(p) {
  const src = fs.readFileSync(p, "utf8");
  const matches = ROLE_PATTERNS.flatMap((regex) => [...src.matchAll(regex)].map((m) => m[1]));
  if (matches.length === 0) return;
  const route = (src.match(ROUTE_REGEX)?.[1]) || "";
  matches.forEach((role) => rows.push([role, p, route, "allow"]));
}

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.isFile() && p.match(/\.(ts|tsx|js|jsx)$/)) scanFile(p);
  }
}
ROOTS.forEach(walk);

const toCsvRow = (row) => {
  const escape = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;
  return row.map(escape).join(",");
};

const csv = rows.map(toCsvRow).join("\n");
fs.writeFileSync("rbac-matrix.csv", csv);
console.log(`[rbac] exported ${rows.length-1} entries to rbac-matrix.csv`);

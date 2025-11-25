#!/usr/bin/env node
/**
 * Next.js API route surface audit — factory/re-export aware
 *
 * Enhanced to detect:
 * - Factory pattern: export const { GET, POST } = createCrudHandlers(...)
 * - Re-exports: export { GET, POST } from './factory'
 * - NextAuth v5: export const { GET, POST } = handlers
 */
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { globby } from "globby";

const ROOT = process.cwd();
const REPORT = path.join(ROOT, "reports", "api-endpoint-scan-v2.json");

// Load waivers if present
let WAIVE = {};
try {
  WAIVE = JSON.parse(
    fs.readFileSync(path.join(ROOT, ".fixzit-waivers.json"), "utf8"),
  );
} catch {}

function ensureDir(p) {
  fs.existsSync(p) || fs.mkdirSync(p, { recursive: true });
}

void (async function main() {
  ensureDir(path.dirname(REPORT));

  const files = await globby(["app/**/route.@(ts|js)"], {
    ignore: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/.git/**",
      "**/.turbo/**",
      "**/.vercel/**",
    ],
  });

  const out = [];

  // Regular patterns for standard exports
  const reFn =
    /\bexport\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/g;
  const reConst = /\bexport\s+const\s+(GET|POST|PUT|PATCH|DELETE)\b/g;

  // Factory pattern: export const { GET, POST } = createCrudHandlers(...)
  const reDestructure =
    /\bexport\s+const\s*\{\s*([A-Z,\s]+)\s*\}\s*=\s*[^;]+;/g;

  // Named re-export: export { GET, POST } from './factory'
  const reNamed =
    /\bexport\s*\{\s*([^}]+)\s*\}\s*from\s*['"`][^'"`]+['"`]\s*;/g;

  // NextAuth v5 pattern: export const { GET, POST } = handlers
  const reNextAuth =
    /\bexport\s+const\s*\{\s*([A-Z,\s]+)\s*\}\s*=\s*handlers\s*;/g;

  for (const f of files) {
    const text = await fsp.readFile(f, "utf8").catch(() => "");
    const methods = new Set();

    // Standard function/const exports
    let m;
    while ((m = reFn.exec(text))) methods.add(m[1]);
    while ((m = reConst.exec(text))) methods.add(m[1]);

    // Destructured factory exports (if enabled)
    if (WAIVE?.routes?.treat_factory_destructures_as_valid) {
      let d;
      while ((d = reDestructure.exec(text))) {
        d[1]
          .split(",")
          .map((s) => s.trim())
          .forEach((n) => {
            if (/^(GET|POST|PUT|PATCH|DELETE)$/.test(n)) methods.add(n);
          });
      }
    }

    // Named re-exports (if enabled)
    if (WAIVE?.routes?.treat_named_reexports_as_valid) {
      let r;
      while ((r = reNamed.exec(text))) {
        r[1]
          .split(",")
          .map((s) => s.trim())
          .forEach((n) => {
            if (/^(GET|POST|PUT|PATCH|DELETE)$/.test(n)) methods.add(n);
          });
      }
    }

    // NextAuth v5 handler destructure (if enabled)
    if (WAIVE?.routes?.treat_nextauth_v5_handlers_as_valid) {
      let a;
      while ((a = reNextAuth.exec(text))) {
        a[1]
          .split(",")
          .map((s) => s.trim())
          .forEach((n) => {
            if (/^(GET|POST|PUT|PATCH|DELETE)$/.test(n)) methods.add(n);
          });
      }
    }

    const importsNextServer = /from\s+['"`]next\/server['"`]/.test(text);

    out.push({
      file: f.replace(/\\/g, "/"),
      methods: [...methods].sort(),
      importsNextServer,
      status: methods.size ? "OK" : "NO_METHODS_DETECTED",
      detectionNote:
        methods.size &&
        (text.includes("createCrudHandlers") || text.includes("handlers"))
          ? "Factory/NextAuth pattern detected"
          : methods.size
            ? "Standard exports"
            : "No HTTP methods found",
    });
  }

  await fsp.writeFile(REPORT, JSON.stringify(out, null, 2), "utf8");

  const totalRoutes = out.length;
  const withMethods = out.filter((r) => r.status === "OK").length;
  const noMethods = out.filter(
    (r) => r.status === "NO_METHODS_DETECTED",
  ).length;

  console.log(`✅ API route scan complete → ${REPORT}`);
  console.log(`   Total routes: ${totalRoutes}`);
  console.log(`   With methods: ${withMethods}`);
  console.log(`   No methods: ${noMethods}`);

  if (noMethods > 0) {
    console.log(`\n⚠️  Routes without detected methods:`);
    out
      .filter((r) => r.status === "NO_METHODS_DETECTED")
      .forEach((r) => {
        console.log(`   - ${r.file}`);
      });
  }
})();

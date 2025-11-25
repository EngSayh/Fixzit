import { readdirSync, statSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const APP = join(ROOT, "app");
const BASE = process.env.ROUTE_VERIFY_BASE || "http://localhost:3000";
const pages: string[] = [];

function replaceDynamicSegments(route: string): string {
  const parts = route.split("/").filter(Boolean);
  const normalized = parts.map((segment) => {
    if (segment.startsWith("[") && segment.endsWith("]")) {
      const key = segment.slice(1, -1).toLowerCase();
      if (
        key.includes("id") ||
        key.includes("order") ||
        key.includes("account")
      ) {
        return "507f1f77bcf86cd799439011"; // valid ObjectId-ish value for tests
      }
      if (key.includes("slug")) {
        return "test-slug";
      }
      if (key.includes("file")) {
        return "sample.pdf";
      }
      return "test";
    }
    return segment;
  });
  return "/" + normalized.join("/");
}

function crawl(dir: string, pathParts: string[] = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) {
      // Strip Next.js route groups like "(app)" and "(dashboard)" from the URL
      const isRouteGroup = name.startsWith("(") && name.endsWith(")");
      const nextParts = isRouteGroup ? pathParts : [...pathParts, name];
      crawl(full, nextParts);
    } else {
      if (/^page\.(tsx|jsx|js|mdx)$/.test(name)) {
        const route = "/" + pathParts.join("/");
        pages.push(route === "/app" ? "/" : route.replace(/^\/app/, "") || "/");
      }
    }
  }
}

try {
  crawl(APP, []);
} catch {
  /* app dir might not exist */
}

const unique = Array.from(new Set(pages.length ? pages : ["/"]));
console.log("Discovered routes:", unique);

function hasErrorCode(error: unknown, code: string): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; cause?: unknown; errors?: unknown[] };
  if (typeof err.code === "string" && err.code === code) {
    return true;
  }
  if (
    Array.isArray(err.errors) &&
    err.errors.some((child) => hasErrorCode(child, code))
  ) {
    return true;
  }
  if (err.cause) {
    return hasErrorCode(err.cause, code);
  }
  return false;
}

function formatConnectionHint(url: string): string {
  return [
    `Connection refused while requesting ${url}.`,
    "Start the Next.js dev server (pnpm dev) or run pnpm verify:routes:http to auto-build/start a local server before verifying routes.",
  ].join(" ");
}

(async () => {
  let failures = 0;
  for (const r of unique) {
    const url = BASE + replaceDynamicSegments(r);
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status >= 400) {
        failures++;
        console.error(`❌ ${res.status} ${url}`);
      } else {
        console.log(`✅ ${res.status} ${url}`);
      }
    } catch (e) {
      failures++;
      if (hasErrorCode(e, "ECONNREFUSED")) {
        console.error(`❌ ERR ${url} ${formatConnectionHint(url)}`);
      } else {
        console.error(`❌ ERR ${url}`, e);
      }
    }
  }
  if (failures) {
    console.error(`Route failures: ${failures}`);
    process.exit(1);
  } else {
    console.log("All discovered routes OK ✅");
  }
})();

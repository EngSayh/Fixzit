import { readdirSync, statSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const APP = join(ROOT, "app");
const BASE = process.env.ROUTE_VERIFY_BASE || "http://localhost:3000";
const pages: string[] = [];

function crawl(dir: string, pathParts: string[] = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) crawl(full, [...pathParts, name]);
    else {
      if (/^page\.(tsx|jsx|js|mdx)$/.test(name)) {
        const route = "/" + pathParts.join("/");
        pages.push(route === "/app" ? "/" : route.replace(/^\/app/, "") || "/");
      }
    }
  }
}

try { crawl(APP, []); } catch { /* app dir might not exist */ }

const unique = Array.from(new Set(pages.length ? pages : ["/"]));
console.log("Discovered routes:", unique);

(async () => {
  let failures = 0;
  for (const r of unique) {
    const url = BASE + r;
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
      console.error(`❌ ERR ${url}`, e);
    }
  }
  if (failures) {
    console.error(`Route failures: ${failures}`);
    process.exit(1);
  } else {
    console.log("All discovered routes OK ✅");
  }
})();

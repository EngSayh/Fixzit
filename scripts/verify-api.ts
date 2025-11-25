import { readdirSync, statSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const API_DIR = join(ROOT, "app", "api");
const BASE = "http://localhost:3000";
const methods = ["GET"];
const endpoints: string[] = [];

function crawl(dir: string, trail: string[] = []) {
  for (const n of readdirSync(dir)) {
    const full = join(dir, n);
    const s = statSync(full);
    if (s.isDirectory()) crawl(full, [...trail, n]);
    else if (/^route\.(ts|js)$/.test(n)) {
      const route = "/api/" + trail.join("/");
      endpoints.push(route);
    }
  }
}

try {
  crawl(API_DIR, []);
} catch {
  /* no api dir */
}

(async () => {
  if (!endpoints.length) {
    console.log("No API routes found. Skipping.");
    process.exit(0);
  }
  let failures = 0;
  for (const ep of endpoints) {
    for (const m of methods) {
      const url = BASE + ep;
      try {
        const res = await fetch(url, { method: m });
        if (res.status >= 500) {
          failures++;
          console.error(`❌ ${m} ${res.status} ${url}`);
        } else {
          console.log(`✅ ${m} ${res.status} ${url}`);
        }
      } catch (e) {
        failures++;
        console.error(`❌ ${m} ERR ${url}`, e);
      }
    }
  }
  if (failures) process.exit(1);
})();

import { promises as fs } from "fs";
import path from "path";

const CANDIDATE_PATTERNS = [
  "work-orders",
  "workOrders",
  "workorders",
  "work_order",
  "WorkOrders",
  "WorkOrder",
];

const GLOB_DIRS = [
  "app",
  "pages",
  "src",
  "src/app",
  "src/pages",
  "src/modules",
  "src/features",
  "components",
  "src/components",
  "server",
  "src/server",
  "lib",
  "src/lib",
  "api",
  "src/api",
];

const HITS = {
  pages: [] as string[],
  apis: [] as string[],
  components: [] as string[],
  schemas: [] as string[],
  tests: [] as string[],
};

async function walk(dir: string) {
  try {
    const ents = await fs.readdir(dir, { withFileTypes: true });
    for (const ent of ents) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) await walk(full);
      else {
        const lname = ent.name.toLowerCase();
        if (!/\.(ts|tsx|js|jsx|json|md|yml|yaml)$/.test(lname)) continue;
        const rel = full.replace(process.cwd() + path.sep, "");
        if (CANDIDATE_PATTERNS.some((p) => rel.toLowerCase().includes(p))) {
          const relLower = rel.toLowerCase();
          if (
            relLower.includes("/api/") ||
            relLower.endsWith("/route.ts") ||
            relLower.includes("api-")
          ) {
            HITS.apis.push(rel);
          } else if (
            relLower.includes("schema") ||
            relLower.includes("model")
          ) {
            HITS.schemas.push(rel);
          } else if (
            relLower.includes("test") ||
            relLower.includes("__tests__")
          ) {
            HITS.tests.push(rel);
          } else if (
            relLower.includes("components") ||
            relLower.includes("component")
          ) {
            HITS.components.push(rel);
          }
          if (relLower.includes("/app/") || relLower.includes("/pages/")) {
            HITS.pages.push(rel);
          }
        }
      }
    }
  } catch (e) {
    // Silently skip directories that can't be read (permissions, deleted, etc.)
    if (process.env.NODE_ENV === "development") {
      console.warn(`Failed to scan directory ${dir}:`, e);
    }
  }
}

(async () => {
  for (const d of GLOB_DIRS) await walk(d);
  const action = {
    hasPage: HITS.pages.length > 0,
    hasAPI: HITS.apis.length > 0,
    hasSchema: HITS.schemas.length > 0,
    nextStep: "" as string,
  };
  if (action.hasPage && action.hasAPI && action.hasSchema) {
    action.nextStep = "CONNECT_ONLY";
  } else {
    action.nextStep = "MISSING_PARTS";
  }
  const out = { found: HITS, action };
  console.log(JSON.stringify(out, null, 2));
})();

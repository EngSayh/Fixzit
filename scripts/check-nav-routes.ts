import { readFileSync, existsSync } from "fs";
import { join } from "path";

type SourceConfig = {
  file: string;
  description: string;
};

const PROJECT_ROOT = process.cwd();
const ROUTE_PATTERN = /(['"])(\/[a-zA-Z0-9/_-]+)\1/g;
const PREFIXES = ["/fm", "/marketplace", "/aqar"];

const SOURCES: SourceConfig[] = [
  { file: "nav/registry.ts", description: "FM navigation registry" },
  { file: "config/topbar-modules.ts", description: "TopBar quick actions" },
  { file: "app/(fm)/fm/dashboard/page.tsx", description: "Dashboard quick actions" },
];

function collectRoutes() {
  const routes = new Set<string>();

  for (const source of SOURCES) {
    const fullPath = join(PROJECT_ROOT, source.file);
    const contents = readFileSync(fullPath, "utf8");
    let match: RegExpExecArray | null;

    while ((match = ROUTE_PATTERN.exec(contents)) !== null) {
      const route = match[2];
      if (!PREFIXES.some((prefix) => route.startsWith(prefix))) {
        continue;
      }
      routes.add(route);
    }
  }

  return Array.from(routes).sort();
}

function ensureRouteHasPage(route: string) {
  const parts = route.replace(/^\/+/, "").split("/");
  const fileLocation = join(PROJECT_ROOT, "app", ...parts, "page.tsx");
  return existsSync(fileLocation);
}

const routes = collectRoutes();
const missing = routes.filter((route) => !ensureRouteHasPage(route));

if (missing.length > 0) {
  console.error("❌ Navigation routes without matching page.tsx:");
  for (const route of missing) {
    const parts = route.replace(/^\/+/, "").split("/");
    const path = join("app", ...parts, "page.tsx");
    console.error(` - ${route} -> ${path}`);
  }
  process.exit(1);
}

console.log(
  `✅ Verified ${routes.length} navigation routes have matching page.tsx files.`,
);

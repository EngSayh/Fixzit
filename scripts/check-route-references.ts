import fg from "fast-glob";
import { readFileSync, readdirSync } from "fs";
import path from "path";

type SegmentType = "static" | "dynamic" | "catchall" | "optionalCatchall";

type Segment = { type: SegmentType; value: string };
type RouteTemplate = { path: string; segments: Segment[] };
type RouteRef = {
  route: string;
  file: string;
  line: number;
  hadTrailingSlash: boolean;
};

const PROJECT_ROOT = process.cwd();
const APP_DIR = path.join(PROJECT_ROOT, "app");
const ROUTE_REGEX = /(['"])(\/(?:fm|marketplace|aqar)[^'"`\s]*)\1/g;
const TEMPLATE_LITERAL_REGEX = /`(\/(?:fm|marketplace|aqar)[^`$]*)`/g;
const FILE_GLOBS = ["**/*.{ts,tsx,js,jsx}"];
const IGNORE_GLOBS = [
  "node_modules/**",
  "**/node_modules/**",
  ".next/**",
  "**/.next/**",
  "dist/**",
  "build/**",
  "coverage/**",
  "_artifacts/**",
  "playwright-report/**",
  "docs/**",
  "reports/**",
  "scripts/fixtures/**",
  "tests/**",
  "**/*.test.ts",
  "**/*.test.tsx",
  "**/*.spec.ts",
  "**/*.spec.tsx",
];

// Routes that are allowed but don't have direct page implementations
// These are typically Next.js redirect/rewrite destination patterns
// or special routes that are handled differently
const ALLOWED_REDIRECT_PATTERNS = [
  /^\/fm\/:path\*$/,           // Catch-all redirect destination pattern
  /^\/marketplace\/:path\*$/,  // Catch-all redirect destination pattern
  /^\/aqar\/:path\*$/,         // Catch-all redirect destination pattern
];

function isAllowedRedirectPattern(route: string): boolean {
  return ALLOWED_REDIRECT_PATTERNS.some((pattern) => pattern.test(route));
}

function isRouteGroup(name: string) {
  return name.startsWith("(") && name.endsWith(")");
}

function isParallelRoute(name: string) {
  return name.startsWith("@");
}

function shouldSkipDir(name: string) {
  if (name === "api") return true;
  if (name.startsWith("_")) return true;
  return false;
}

function parseSegment(name: string): Segment {
  if (name.startsWith("[[...") && name.endsWith("]]")) {
    return { type: "optionalCatchall", value: name.slice(4, -2) };
  }
  if (name.startsWith("[...") && name.endsWith("]")) {
    return { type: "catchall", value: name.slice(4, -1) };
  }
  if (name.startsWith("[") && name.endsWith("]")) {
    return { type: "dynamic", value: name.slice(1, -1) };
  }
  return { type: "static", value: name };
}

function collectRouteTemplates(
  dir = APP_DIR,
  acc: string[] = [],
): RouteTemplate[] {
  let templates: RouteTemplate[] = [];
  let entries: ReturnType<typeof readdirSync> = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return templates;
  }

  for (const entry of entries) {
    const currentPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (isRouteGroup(entry.name) || isParallelRoute(entry.name)) {
        templates = templates.concat(collectRouteTemplates(currentPath, acc));
        continue;
      }
      if (shouldSkipDir(entry.name)) continue;

      templates = templates.concat(
        collectRouteTemplates(currentPath, [...acc, entry.name]),
      );
      continue;
    }

    if (!/^page\.(tsx|ts|jsx|js|mdx)$/.test(entry.name)) continue;
    const routePath = "/" + acc.filter(Boolean).join("/");
    templates.push({
      path: routePath === "/" ? "/" : routePath.replace(/\/+/g, "/"),
      segments: acc.map(parseSegment),
    });
  }

  return templates;
}

function normalizeRoute(raw: string) {
  if (!raw) return "/";
  const base = raw.split(/[?#]/)[0] || "/";
  if (base !== "/" && base.endsWith("/")) {
    return base.slice(0, -1);
  }
  return base || "/";
}

function getLineNumber(source: string, index: number) {
  return source.slice(0, index).split("\n").length;
}

function collectRouteReferences(): RouteRef[] {
  const files = fg.sync(FILE_GLOBS, {
    cwd: PROJECT_ROOT,
    ignore: IGNORE_GLOBS,
    dot: false,
  });
  const refs: RouteRef[] = [];

  for (const file of files) {
    const fullPath = path.join(PROJECT_ROOT, file);
    const contents = readFileSync(fullPath, "utf8");

    for (const match of contents.matchAll(ROUTE_REGEX)) {
      const value = match[2];
      if (!value) continue;
      const line = getLineNumber(contents, match.index ?? 0);
      refs.push({
        route: value,
        file,
        line,
        hadTrailingSlash: value.length > 1 && value.endsWith("/"),
      });
    }

    for (const match of contents.matchAll(TEMPLATE_LITERAL_REGEX)) {
      const value = match[1];
      if (!value) continue;
      const line = getLineNumber(contents, match.index ?? 0);
      refs.push({
        route: value,
        file,
        line,
        hadTrailingSlash: value.length > 1 && value.endsWith("/"),
      });
    }
  }

  return refs;
}

function matchesTemplate(
  template: Segment[],
  segments: string[],
  tIndex = 0,
  sIndex = 0,
): boolean {
  if (tIndex === template.length) {
    return sIndex === segments.length;
  }

  const seg = template[tIndex];
  switch (seg.type) {
    case "static":
      if (segments[sIndex] !== seg.value) return false;
      return matchesTemplate(template, segments, tIndex + 1, sIndex + 1);
    case "dynamic":
      if (sIndex >= segments.length) return false;
      return matchesTemplate(template, segments, tIndex + 1, sIndex + 1);
    case "catchall": {
      if (sIndex >= segments.length) return false;
      for (let consumed = 1; sIndex + consumed <= segments.length; consumed++) {
        if (
          matchesTemplate(template, segments, tIndex + 1, sIndex + consumed)
        ) {
          return true;
        }
      }
      return false;
    }
    case "optionalCatchall": {
      for (let consumed = 0; sIndex + consumed <= segments.length; consumed++) {
        if (
          matchesTemplate(template, segments, tIndex + 1, sIndex + consumed)
        ) {
          return true;
        }
      }
      return false;
    }
    default:
      return false;
  }
}

function matchesDynamicPrefix(template: Segment[], literalSegments: string[]) {
  const firstDynamicIndex = template.findIndex(
    (segment) => segment.type !== "static",
  );
  if (firstDynamicIndex === -1) return false;
  if (literalSegments.length !== firstDynamicIndex) return false;

  for (let i = 0; i < firstDynamicIndex; i += 1) {
    const seg = template[i];
    if (seg.type !== "static" || seg.value !== literalSegments[i]) {
      return false;
    }
  }

  return true;
}

function routeExists(
  route: string,
  hadTrailingSlash: boolean,
  templates: RouteTemplate[],
) {
  const clean = normalizeRoute(route);
  if (clean === "/") return true;
  const segments = clean.replace(/^\/+/, "").split("/").filter(Boolean);

  return templates.some((template) => {
    if (matchesTemplate(template.segments, segments)) {
      return true;
    }
    return (
      hadTrailingSlash && matchesDynamicPrefix(template.segments, segments)
    );
  });
}

function main() {
  const templates = collectRouteTemplates();
  const refs = collectRouteReferences();
  const grouped = new Map<string, RouteRef[]>();

  refs.forEach((ref) => {
    const arr = grouped.get(ref.route) ?? [];
    arr.push(ref);
    grouped.set(ref.route, arr);
  });

  const missing: Array<{ normalized: string; refs: RouteRef[] }> = [];

  grouped.forEach((value, route) => {
    const normalized = normalizeRoute(route);
    // Skip allowed redirect patterns (e.g., /fm/:path*)
    if (isAllowedRedirectPattern(normalized)) {
      return;
    }
    const hadTrailingSlash = value.some((ref) => ref.hadTrailingSlash);
    if (!routeExists(route, hadTrailingSlash, templates)) {
      missing.push({ normalized, refs: value });
    }
  });

  if (missing.length > 0) {
    console.error("❌ Route references without matching page implementations:");
    for (const miss of missing) {
      console.error(` - ${miss.normalized}`);
      miss.refs.forEach((ref) => {
        console.error(`    • ${ref.file}:${ref.line}`);
      });
    }
    process.exit(1);
  }

  console.log(
    `✅ Verified ${grouped.size} route references have matching page.tsx files.`,
  );
}

main();

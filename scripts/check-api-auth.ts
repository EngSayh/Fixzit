/**
 * CI guard: fail if any API route file under app/api is missing an auth/guard
 * and is not explicitly allowlisted as public.
 */
import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import {
  PUBLIC_API_PREFIXES,
  DEV_API_PREFIXES,
} from "../config/routes/public";

const ROOT = path.resolve(__dirname, "..");
const ROUTE_GLOB = "app/api/**/route.ts";

const GUARD_REGEX =
  /(createCrudHandlers|requireAbility|requireSuperAdmin|getSessionUser|auth\(|getUserFromToken|requireAuth|withAuthRbac|requirePermission|getOrgContext|validateSession|isAuthenticated|requireSubscription|requireFmAbility|requireFmPermission|resolveMarketplaceContext|resolveCopilotSession|atsRBAC|resolveRequestSession|getServerSession|verifySecretHeader)/i;

const ALLOWLIST_EXCEPTIONS = new Set<string>([
  "/api/auth/[...nextauth]",
]);

const matchesRoute = (pathname: string, route: string): boolean => {
  if (pathname === route) return true;
  if (pathname.startsWith(route)) {
    const nextChar = pathname[route.length];
    if (nextChar === "/" || nextChar === undefined) return true;
  }
  return false;
};

const isPublicApi = (pathname: string): boolean =>
  PUBLIC_API_PREFIXES.some((r) => matchesRoute(pathname, r)) ||
  ALLOWLIST_EXCEPTIONS.has(pathname);

const isDevApi = (pathname: string): boolean =>
  DEV_API_PREFIXES.some((r) => matchesRoute(pathname, r));

const toRoutePath = (file: string): string => {
  const normalized = file.replace(/\\/g, "/");
  const withoutApp = normalized.replace(/^app\//, "");
  return `/${withoutApp.replace(/\/route\.ts$/, "")}`;
};

const main = () => {
  const files = fg.sync(ROUTE_GLOB, { cwd: ROOT });
  const missing: string[] = [];

  for (const file of files) {
    const fullPath = path.join(ROOT, file);
    const content = fs.readFileSync(fullPath, "utf8");
    const routePath = toRoutePath(file);

    if (GUARD_REGEX.test(content)) continue;
    if (isPublicApi(routePath)) continue;
    if (isDevApi(routePath)) continue;

    missing.push(routePath);
  }

  if (missing.length) {
    console.error(
      "🚫 Found API routes without auth/guard and not in public allowlist:",
    );
    for (const route of missing) {
      console.error(` - ${route}`);
    }
    console.error(
      `Add an auth wrapper (e.g., requireAbility/requireSuperAdmin/getSessionUser) or add an explicit public allowlist entry in config/routes/public.ts if intentional.`,
    );
    process.exit(1);
  } else {
    console.log("✅ All API routes are guarded or explicitly allowlisted.");
  }
};

main();

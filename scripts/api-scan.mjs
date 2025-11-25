#!/usr/bin/env node
/**
 * API Endpoint Scanner (Next.js App Router)
 *
 * Discovers all API routes in the Next.js App Router structure:
 * - Finds route.ts and route.js files
 * - Extracts exported HTTP methods (GET, POST, PUT, DELETE, etc.)
 * - Generates comprehensive API inventory
 *
 * Output: reports/api-endpoint-scan.json
 *
 * Usage:
 *   node scripts/api-scan.mjs
 */

import fs from "fs";
import path from "path";
import { globby } from "globby";

const ROOT_DIR = process.cwd();
const REPORTS_DIR = path.join(ROOT_DIR, "reports");
const APP_DIR = path.join(ROOT_DIR, "app");

async function main() {
  console.log("🔍 Scanning for Next.js API routes...");

  await fs.promises.mkdir(REPORTS_DIR, { recursive: true });

  const routes = await scanApiRoutes();

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalRoutes: routes.length,
      byMethod: countByMethod(routes),
    },
    routes,
  };

  const reportPath = path.join(REPORTS_DIR, "api-endpoint-scan.json");
  await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2));

  console.log(`✅ API scan complete. Found ${routes.length} routes.`);
  console.log(`   Report saved to: ${reportPath}`);
  console.log(`   Methods: ${JSON.stringify(report.summary.byMethod)}`);
}

async function scanApiRoutes() {
  const routes = [];

  try {
    const routeFiles = await globby("**/route.{ts,js}", {
      cwd: APP_DIR,
      gitignore: true,
      onlyFiles: true,
    });

    for (const file of routeFiles) {
      const fullPath = path.join(APP_DIR, file);
      const content = await fs.promises.readFile(fullPath, "utf-8");

      // Extract directory path (route path)
      const routePath = `/api/${path.dirname(file)}`.replace(/\/+/g, "/");

      // Detect exported HTTP methods
      const methods = extractHttpMethods(content);

      routes.push({
        file: path.relative(ROOT_DIR, fullPath),
        routePath,
        methods,
      });
    }

    return routes;
  } catch (error) {
    console.error("Failed to scan API routes:", error);
    return [];
  }
}

function extractHttpMethods(content) {
  const methods = [];
  const httpMethods = [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "PATCH",
    "HEAD",
    "OPTIONS",
  ];

  for (const method of httpMethods) {
    // Match: export async function GET(...) or export function GET(...)
    const regex = new RegExp(
      `export\\s+(async\\s+)?function\\s+${method}\\s*\\(`,
      "g",
    );
    if (regex.test(content)) {
      methods.push(method);
    }
  }

  return methods;
}

function countByMethod(routes) {
  const counts = {};
  routes.forEach((route) => {
    route.methods.forEach((method) => {
      counts[method] = (counts[method] || 0) + 1;
    });
  });
  return counts;
}

main().catch((err) => {
  console.error("❌ API scan failed:", err);
  process.exit(1);
});

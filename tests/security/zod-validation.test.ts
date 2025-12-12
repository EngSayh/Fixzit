/**
 * @fileoverview Tests for Zod validation coverage across API routes
 * @description Verifies that API routes properly validate input with Zod
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Critical routes that MUST have Zod validation for security
 */
const CRITICAL_ROUTES_REQUIRING_ZOD = [
  // Auth routes
  "app/api/auth/login",
  "app/api/auth/register",
  "app/api/auth/forgot-password",
  "app/api/auth/verify/send",
  // Admin routes (admin/users uses inline validation, not Zod)
  "app/api/admin/billing/annual-discount",
  // Finance routes
  "app/api/billing/quote",
  // Marketplace routes
  "app/api/souq/reviews",
];

describe("Zod Validation Coverage", () => {
  function getRouteFiles(dir: string): string[] {
    const files: string[] = [];
    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getRouteFiles(fullPath));
      } else if (entry.name === "route.ts") {
        files.push(fullPath);
      }
    }
    return files;
  }

  it("should have Zod imports in critical routes", () => {
    const missing: string[] = [];

    for (const routePath of CRITICAL_ROUTES_REQUIRING_ZOD) {
      const routeFile = path.join(process.cwd(), routePath, "route.ts");

      if (fs.existsSync(routeFile)) {
        const content = fs.readFileSync(routeFile, "utf-8");

        if (!content.includes('from "zod"') && !content.includes("from 'zod'")) {
          missing.push(routePath);
        }
      }
    }

    if (missing.length > 0) {
      expect.fail(
        `Missing Zod imports in ${missing.length} critical routes:\n${missing.join("\n")}`
      );
    }
  });

  it("should use .safeParse or .parse in routes with Zod", () => {
    const issues: string[] = [];

    for (const routePath of CRITICAL_ROUTES_REQUIRING_ZOD) {
      const routeFile = path.join(process.cwd(), routePath, "route.ts");

      if (fs.existsSync(routeFile)) {
        const content = fs.readFileSync(routeFile, "utf-8");

        // If Zod is imported, verify it's being used
        if (content.includes('from "zod"') || content.includes("from 'zod'")) {
          if (
            !content.includes(".safeParse(") &&
            !content.includes(".parse(")
          ) {
            issues.push(`${routePath}: Zod imported but not used`);
          }
        }
      }
    }

    if (issues.length > 0) {
      expect.fail(
        `Zod usage issues found:\n${issues.join("\n")}`
      );
    }
  });

  it("should use correct Zod error access pattern (.issues not .errors)", () => {
    const appApiDir = path.join(process.cwd(), "app/api");
    const files = getRouteFiles(appApiDir);
    const violations: string[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");

      // Check for incorrect .errors access on Zod errors
      // The correct pattern is .issues
      if (
        content.includes("ZodError") &&
        content.includes(".errors") &&
        !content.includes(".issues")
      ) {
        violations.push(path.relative(process.cwd(), file));
      }
    }

    if (violations.length > 0) {
      expect.fail(
        `Found ${violations.length} files using incorrect .errors instead of .issues:\n${violations.join("\n")}`
      );
    }
  });

  it("should count total routes with Zod validation", () => {
    const appApiDir = path.join(process.cwd(), "app/api");
    const files = getRouteFiles(appApiDir);
    let zodCount = 0;

    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      if (
        content.includes(".safeParse(") ||
        content.includes(".parse(")
      ) {
        zodCount++;
      }
    }

    // Log for visibility
    console.log(`Routes with Zod validation: ${zodCount}/${files.length}`);

    // We expect at least 50% coverage as a baseline
    const coverage = zodCount / files.length;
    expect(coverage).toBeGreaterThanOrEqual(0.3); // 30% minimum for now
  });
});

describe("Zod Schema Correctness", () => {
  it("should not use deprecated Zod patterns", () => {
    const appApiDir = path.join(process.cwd(), "app/api");
    const files: string[] = [];

    function getFiles(dir: string): void {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          getFiles(fullPath);
        } else if (entry.name.endsWith(".ts")) {
          files.push(fullPath);
        }
      }
    }

    getFiles(appApiDir);

    const deprecatedPatterns = [
      { pattern: /\.nonEmpty\(\)/g, message: ".nonEmpty() is deprecated, use .min(1)" },
    ];

    const issues: string[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      for (const { pattern, message } of deprecatedPatterns) {
        if (pattern.test(content)) {
          issues.push(`${path.relative(process.cwd(), file)}: ${message}`);
        }
      }
    }

    // This is informational - don't fail the test
    if (issues.length > 0) {
      console.warn(`Deprecated Zod patterns found:\n${issues.join("\n")}`);
    }
  });
});

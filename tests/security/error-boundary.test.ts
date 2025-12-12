/**
 * @fileoverview Tests for error boundary coverage across the application
 * @description Verifies that critical modules have error boundaries
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Critical modules that MUST have error boundaries for production readiness
 */
const REQUIRED_ERROR_BOUNDARIES = [
  "app/work-orders",
  "app/fm",
  "app/settings",
  "app/crm",
  "app/hr",
  "app/finance",
  "app/aqar",
  "app/souq",
  "app/admin",
  "app/dashboard",
  "app/properties",
  "app/vendors",
];

describe("Error Boundary Coverage", () => {
  it("should have error.tsx in all critical modules", () => {
    const missing: string[] = [];

    for (const modulePath of REQUIRED_ERROR_BOUNDARIES) {
      const errorBoundaryPath = path.join(
        process.cwd(),
        modulePath,
        "error.tsx"
      );

      if (!fs.existsSync(errorBoundaryPath)) {
        missing.push(modulePath);
      }
    }

    if (missing.length > 0) {
      expect.fail(
        `Missing error.tsx in ${missing.length} critical modules:\n${missing.join("\n")}`
      );
    }
  });

  it("should have proper error boundary structure in existing files", () => {
    const issues: string[] = [];

    for (const modulePath of REQUIRED_ERROR_BOUNDARIES) {
      const errorBoundaryPath = path.join(
        process.cwd(),
        modulePath,
        "error.tsx"
      );

      if (fs.existsSync(errorBoundaryPath)) {
        const content = fs.readFileSync(errorBoundaryPath, "utf-8");

        // Check for required exports and patterns
        if (!content.includes('"use client"')) {
          issues.push(`${modulePath}/error.tsx: Missing "use client" directive`);
        }
        if (!content.includes("export default")) {
          issues.push(`${modulePath}/error.tsx: Missing default export`);
        }
        if (!content.includes("reset")) {
          issues.push(`${modulePath}/error.tsx: Missing reset function usage`);
        }
      }
    }

    if (issues.length > 0) {
      expect.fail(
        `Error boundary issues found:\n${issues.join("\n")}`
      );
    }
  });

  it("should count total error boundaries in the application", () => {
    const appDir = path.join(process.cwd(), "app");
    let count = 0;

    function countErrorBoundaries(dir: string): void {
      if (!fs.existsSync(dir)) return;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          countErrorBoundaries(fullPath);
        } else if (entry.name === "error.tsx") {
          count++;
        }
      }
    }

    countErrorBoundaries(appDir);

    // We expect at least 12 error boundaries for production readiness
    expect(count).toBeGreaterThanOrEqual(12);
  });
});

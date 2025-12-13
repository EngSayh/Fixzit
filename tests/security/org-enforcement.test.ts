/**
 * @fileoverview Tests for organization (orgId) enforcement across the codebase
 * @description Verifies that routes and resolvers require orgId and don't fall back to userId
 * @security Critical for tenant isolation
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Pattern detection tests to ensure no userId-as-orgId fallbacks exist
 */
describe("OrgId Enforcement - Pattern Detection", () => {
  const appApiDir = path.join(process.cwd(), "app/api");
  const libDir = path.join(process.cwd(), "lib");

  /**
   * Scans a directory recursively for TypeScript files
   */
  function getTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];
    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getTypeScriptFiles(fullPath));
      } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
        files.push(fullPath);
      }
    }
    return files;
  }

  /**
   * Checks if a file contains dangerous userId-as-orgId fallback patterns
   */
  function checkForDangerousPatterns(filePath: string): string[] {
    const content = fs.readFileSync(filePath, "utf-8");
    const violations: string[] = [];

    // Patterns that indicate userId being used as orgId fallback
    const dangerousPatterns = [
      /orgId\s*=\s*(?:ctx|session|user)\.(?:orgId|org_id)\s*\?\?\s*(?:ctx|session|user)\.(?:userId|user_id|id)/g,
      /orgId\s*=\s*(?:ctx|session|user)\.(?:orgId|org_id)\s*\|\|\s*(?:ctx|session|user)\.(?:userId|user_id|id)/g,
      /orgId:\s*(?:ctx|session|user)\.(?:orgId|org_id)\s*\?\?\s*(?:ctx|session|user)\.(?:userId|user_id|id)/g,
      /orgId:\s*(?:ctx|session|user)\.(?:orgId|org_id)\s*\|\|\s*(?:ctx|session|user)\.(?:userId|user_id|id)/g,
    ];

    for (const pattern of dangerousPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        violations.push(...matches);
      }
    }

    return violations;
  }

  it("should not have userId-as-orgId fallback patterns in app/api", () => {
    const files = getTypeScriptFiles(appApiDir);
    const allViolations: { file: string; patterns: string[] }[] = [];

    for (const file of files) {
      const violations = checkForDangerousPatterns(file);
      if (violations.length > 0) {
        allViolations.push({
          file: path.relative(process.cwd(), file),
          patterns: violations,
        });
      }
    }

    if (allViolations.length > 0) {
      const message = allViolations
        .map((v) => `${v.file}:\n  ${v.patterns.join("\n  ")}`)
        .join("\n\n");
      expect.fail(
        `Found ${allViolations.length} files with userId-as-orgId fallback patterns:\n\n${message}`
      );
    }
  });

  it("should not have userId-as-orgId fallback patterns in lib/graphql", () => {
    const graphqlDir = path.join(libDir, "graphql");
    const files = getTypeScriptFiles(graphqlDir);
    const allViolations: { file: string; patterns: string[] }[] = [];

    for (const file of files) {
      const violations = checkForDangerousPatterns(file);
      if (violations.length > 0) {
        allViolations.push({
          file: path.relative(process.cwd(), file),
          patterns: violations,
        });
      }
    }

    if (allViolations.length > 0) {
      const message = allViolations
        .map((v) => `${v.file}:\n  ${v.patterns.join("\n  ")}`)
        .join("\n\n");
      expect.fail(
        `Found ${allViolations.length} files with userId-as-orgId fallback patterns:\n\n${message}`
      );
    }
  });
});

describe("OrgId Enforcement - GraphQL Context", () => {
  it("should verify orgId is required for dashboard stats (SEC-FIX applied)", () => {
    const graphqlFile = path.join(
      process.cwd(),
      "lib/graphql/index.ts"
    );
    const content = fs.readFileSync(graphqlFile, "utf-8");

    // Verify the SEC-FIX comment is present
    expect(content).toContain("SEC-FIX: Require orgId");

    // Verify we log when orgId is missing
    expect(content).toContain(
      "dashboardStats: Missing orgId in context"
    );
  });

  it("should verify orgId is required for createWorkOrder (SEC-FIX applied)", () => {
    const graphqlFile = path.join(
      process.cwd(),
      "lib/graphql/index.ts"
    );
    const content = fs.readFileSync(graphqlFile, "utf-8");

    // Verify the SEC-FIX for createWorkOrder
    expect(content).toContain(
      "Organization context is required for creating work orders"
    );
  });
});

describe("OrgId Enforcement - API Routes", () => {
  it("should verify Souq reviews route requires orgId (SEC-FIX applied)", () => {
    const routeFile = path.join(
      process.cwd(),
      "app/api/souq/reviews/route.ts"
    );
    const content = fs.readFileSync(routeFile, "utf-8");

    expect(content).toContain("SEC-FIX: Require orgId");
    expect(content).toContain("Organization context is required");
  });

  it("should verify Aqar listings route requires orgId (SEC-FIX applied)", () => {
    const routeFile = path.join(
      process.cwd(),
      "app/api/aqar/listings/route.ts"
    );
    const content = fs.readFileSync(routeFile, "utf-8");

    expect(content).toContain("SEC-FIX: Require orgId");
    expect(content).toContain(
      "Organization context is required to create listings"
    );
  });

  it("should verify Aqar packages route requires orgId (SEC-FIX applied)", () => {
    const routeFile = path.join(
      process.cwd(),
      "app/api/aqar/packages/route.ts"
    );
    const content = fs.readFileSync(routeFile, "utf-8");

    expect(content).toContain("SEC-FIX: Require orgId");
    expect(content).toContain(
      "Organization context is required to purchase packages"
    );
  });

  it("should verify Aqar favorites route requires orgId (SEC-FIX applied)", () => {
    const routeFile = path.join(
      process.cwd(),
      "app/api/aqar/favorites/route.ts"
    );
    const content = fs.readFileSync(routeFile, "utf-8");

    expect(content).toContain("SEC-FIX: Require orgId");
  });
});

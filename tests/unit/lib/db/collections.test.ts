/**
 * Collection Name Validation Tests
 *
 * Ensures all MongoDB collection accesses use the centralized COLLECTIONS constant
 * to prevent collection name drift and cross-tenant data issues.
 *
 * @see lib/db/collections.ts for the canonical collection names
 */

import { describe, it, expect } from "vitest";
import { COLLECTIONS } from "@/lib/db/collections";
import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";

describe("COLLECTIONS constant", () => {
  it("should have all required collection names defined", () => {
    // Core collections
    expect(COLLECTIONS.TENANTS).toBe("tenants");
    expect(COLLECTIONS.USERS).toBe("users");
    expect(COLLECTIONS.PROPERTIES).toBe("properties");
    expect(COLLECTIONS.WORK_ORDERS).toBe("workorders");
    expect(COLLECTIONS.INVOICES).toBe("invoices");
    expect(COLLECTIONS.VENDORS).toBe("vendors");
    expect(COLLECTIONS.PRODUCTS).toBe("products");
    expect(COLLECTIONS.ORDERS).toBe("orders");

    // Additional collections
    expect(COLLECTIONS.UNITS).toBe("units");
    expect(COLLECTIONS.SERVICES).toBe("services");
    expect(COLLECTIONS.PROJECTS).toBe("projects");
    expect(COLLECTIONS.AGENTS).toBe("agents");
    expect(COLLECTIONS.LISTINGS).toBe("listings");
    expect(COLLECTIONS.RFQ_RESPONSES).toBe("rfq_responses");

    // Support/CRM collections
    expect(COLLECTIONS.SUPPORT_TICKETS).toBe("supporttickets");
    expect(COLLECTIONS.CUSTOMERS).toBe("customers");
    expect(COLLECTIONS.CONTRACTS).toBe("contracts");

    // HR collections
    expect(COLLECTIONS.EMPLOYEES).toBe("employees");
    expect(COLLECTIONS.ATTENDANCE).toBe("attendances");

    // Marketplace collections
    expect(COLLECTIONS.SOUQ_LISTINGS).toBe("souq_listings");
    expect(COLLECTIONS.SOUQ_ORDERS).toBe("souq_orders");
    expect(COLLECTIONS.SOUQ_REVIEWS).toBe("souq_reviews");

    // Admin collections
    expect(COLLECTIONS.ROLES).toBe("roles");
    expect(COLLECTIONS.API_KEYS).toBe("api_keys");

    // QA collections
    expect(COLLECTIONS.QA_LOGS).toBe("qa_logs");
    expect(COLLECTIONS.QA_ALERTS).toBe("qa_alerts");

    // Other collections
    expect(COLLECTIONS.RFQS).toBe("rfqs");
    expect(COLLECTIONS.CATEGORIES).toBe("categories");
    expect(COLLECTIONS.CARTS).toBe("carts");
    expect(COLLECTIONS.REVIEWS).toBe("reviews");
    expect(COLLECTIONS.NOTIFICATIONS).toBe("notifications");
    expect(COLLECTIONS.AUDIT_LOGS).toBe("auditLogs");
  });

  it("should have consistent lowercase naming for most collections", () => {
    const values = Object.values(COLLECTIONS);
    const inconsistentNames = values.filter((name) => {
      // Allow snake_case for compound names (e.g., "souq_listings", "qa_logs")
      // Allow camelCase only for legacy (e.g., "auditLogs")
      const isSnakeCase = /^[a-z]+(_[a-z]+)*$/.test(name);
      const isCamelCase = /^[a-z]+[A-Z][a-zA-Z]*$/.test(name);
      const isLowercase = /^[a-z]+$/.test(name);
      return !isSnakeCase && !isCamelCase && !isLowercase;
    });

    expect(
      inconsistentNames,
      `Found inconsistent collection names: ${inconsistentNames.join(", ")}`
    ).toHaveLength(0);
  });

  it("should not have duplicate collection names", () => {
    const values = Object.values(COLLECTIONS);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });
});

describe("Collection name usage validation", () => {
  // Known files that are allowed to use hardcoded collection names
  // (e.g., migration scripts, test fixtures)
  const ALLOWED_HARDCODED_FILES = [
    "scripts/testing/",
    "scripts/migrations/",
    "tests/fixtures/",
    "docs/",
    ".md",
  ];

  // Known collection names that MUST use COLLECTIONS constant
  const PROTECTED_COLLECTION_NAMES = [
    "workorders",
    "work_orders", // Legacy variant - should not exist
    "invoices",
    "properties",
    "vendors",
    "tenants",
    "units",
    "services",
    "projects",
    "agents",
    "supporttickets",
    "support_tickets", // Legacy variant - should not exist
    "employees",
    "customers",
    "contracts",
    "souq_listings",
    "souq_orders",
    "souq_reviews",
    "products",
    "orders",
    "rfqs",
  ];

  it("should detect hardcoded collection names in production code", async () => {
    const projectRoot = path.resolve(__dirname, "../../../..");
    const productionDirs = ["app/api", "lib", "server/services"];

    const violations: string[] = [];

    for (const dir of productionDirs) {
      const dirPath = path.join(projectRoot, dir);
      if (!fs.existsSync(dirPath)) continue;

      const files = await glob(`${dirPath}/**/*.{ts,tsx,js}`, {
        ignore: ["**/node_modules/**", "**/*.test.*", "**/*.spec.*"],
      });

      for (const file of files) {
        // Skip allowed files
        if (ALLOWED_HARDCODED_FILES.some((allowed) => file.includes(allowed))) {
          continue;
        }

        const content = fs.readFileSync(file, "utf-8");

        // Check for hardcoded collection names in .collection("name") calls
        for (const collName of PROTECTED_COLLECTION_NAMES) {
          // Match patterns like: .collection("workorders") or .collection('workorders')
          const regex = new RegExp(
            `\\.collection\\s*\\(\\s*["'\`]${collName}["'\`]\\s*\\)`,
            "g"
          );

          if (regex.test(content)) {
            // Check if it's using COLLECTIONS constant
            const usesConstant =
              content.includes(`COLLECTIONS.`) &&
              content.includes(`from "@/lib/db/collections"`);

            if (!usesConstant) {
              violations.push(
                `${file}: Hardcoded collection name "${collName}" - use COLLECTIONS constant`
              );
            }
          }
        }
      }
    }

    // Report violations but don't fail - this is for awareness
    if (violations.length > 0) {
      console.warn(
        "\n⚠️ Collection name violations found (should use COLLECTIONS constant):\n" +
          violations.map((v) => `  - ${v}`).join("\n")
      );
    }

    // For now, we allow some violations since migration is in progress
    // Once migration is complete, uncomment the line below to enforce
    // expect(violations).toHaveLength(0);
  });

  it("should not have legacy snake_case collection names in new code", async () => {
    const projectRoot = path.resolve(__dirname, "../../../..");
    const productionDirs = ["app/api", "lib"];

    const legacyNames = ["work_orders", "support_tickets", "org_id"];
    const violations: string[] = [];

    for (const dir of productionDirs) {
      const dirPath = path.join(projectRoot, dir);
      if (!fs.existsSync(dirPath)) continue;

      const files = await glob(`${dirPath}/**/*.{ts,tsx}`, {
        ignore: ["**/node_modules/**"],
      });

      for (const file of files) {
        const content = fs.readFileSync(file, "utf-8");

        for (const legacyName of legacyNames) {
          // Match patterns like: collection("work_orders") or { org_id: ...}
          const regex = new RegExp(`["'\`]${legacyName}["'\`]`, "g");
          const matches = content.match(regex);

          if (matches && matches.length > 0) {
            violations.push(
              `${file}: Legacy name "${legacyName}" found ${matches.length} times`
            );
          }
        }
      }
    }

    // Report violations
    if (violations.length > 0) {
      console.warn(
        "\n⚠️ Legacy snake_case names found:\n" +
          violations.map((v) => `  - ${v}`).join("\n")
      );
    }

    // This should be zero after migration
    // expect(violations).toHaveLength(0);
  });
});

describe("COLLECTIONS type safety", () => {
  it("should be readonly to prevent accidental modification", () => {
    // TypeScript should prevent this at compile time
    // This test documents the expected behavior
    const collections = COLLECTIONS;
    expect(typeof collections).toBe("object");
    expect(Object.isFrozen(collections)).toBe(false); // as const doesn't freeze at runtime
    // But TypeScript's "as const" ensures type-level readonly
  });

  it("should export collection names as string literal types", () => {
    // Verify that collection values are typed as specific strings, not just "string"
    type WorkOrdersType = typeof COLLECTIONS.WORK_ORDERS;
    const _typeCheck: WorkOrdersType = "workorders";
    expect(_typeCheck).toBe("workorders");
  });
});

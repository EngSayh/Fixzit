/**
 * RBAC Parity Test
 * Phase C: Prevent silent drift when roles change in source
 * 
 * This test regenerates client roles and compares against committed file
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

describe("RBAC Parity Test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should match generated client roles with committed file", async () => {
    const generatorScript = path.join(process.cwd(), "scripts/rbac/generate-client-roles.ts");
    const outputFile = path.join(process.cwd(), "lib/rbac/client-roles.ts");
    const tempFile = path.join(process.cwd(), "lib/rbac/client-roles.temp.ts");

    // Check if generator exists
    const generatorExists = await fs.access(generatorScript).then(() => true).catch(() => false);
    
    if (!generatorExists) {
      console.warn("⚠️ RBAC generator script not found, skipping parity test");
      return;
    }

    try {
      // Run generator to temp file
      await execAsync(`tsx ${generatorScript} > ${tempFile}`);

      // Read both files
      const generated = await fs.readFile(tempFile, "utf-8");
      const committed = await fs.readFile(outputFile, "utf-8");

      // Normalize whitespace for comparison
      const normalizeContent = (content: string) => {
        return content
          .replace(/\r\n/g, "\n") // Normalize line endings
          .replace(/\s+$/gm, "") // Remove trailing whitespace
          .trim();
      };

      const normalizedGenerated = normalizeContent(generated);
      const normalizedCommitted = normalizeContent(committed);

      // Compare
      if (normalizedGenerated !== normalizedCommitted) {
        console.error("❌ RBAC client roles out of sync!");
        console.error("Generated file differs from committed version.");
        console.error("Run: npm run rbac:generate to update client roles");
        
        // Show diff summary
        const generatedLines = normalizedGenerated.split("\n");
        const committedLines = normalizedCommitted.split("\n");
        
        console.error(`\nGenerated: ${generatedLines.length} lines`);
        console.error(`Committed: ${committedLines.length} lines`);
      }

      expect(normalizedGenerated).toBe(normalizedCommitted);
    } finally {
      // Cleanup temp file
      await fs.unlink(tempFile).catch(() => {});
    }
  }, 30000); // 30s timeout for generator execution

  it("should have all roles from domain/fm/fm.types.ts in client-roles", async () => {
    const clientRolesPath = path.join(process.cwd(), "lib/rbac/client-roles.ts");
    const fmTypesPath = path.join(process.cwd(), "domain/fm/fm.types.ts");

    const clientRolesContent = await fs.readFile(clientRolesPath, "utf-8");
    const fmTypesContent = await fs.readFile(fmTypesPath, "utf-8");

    // Extract role names from fm.types.ts (simplified regex)
    const roleMatches = fmTypesContent.match(/export const ROLE_(\w+)/g) || [];
    const roles = roleMatches.map((m) => m.replace("export const ROLE_", ""));

    // Check each role exists in client-roles
    for (const role of roles) {
      expect(
        clientRolesContent.includes(role),
        `Role ${role} from domain/fm/fm.types.ts not found in lib/rbac/client-roles.ts`
      ).toBe(true);
    }
  });

  it("should have ROLE_ALIAS_MAP imported from domain", async () => {
    const clientRolesPath = path.join(process.cwd(), "lib/rbac/client-roles.ts");
    const content = await fs.readFile(clientRolesPath, "utf-8");

    // Should import ROLE_ALIAS_MAP from domain (not define locally)
    expect(content).toContain('from "@/domain/fm/fm.types"');
    expect(content).toMatch(/import.*ROLE_ALIAS_MAP/);
  });
});

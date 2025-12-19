import { describe, expect, it } from "vitest";
import { glob } from "glob";
import fs from "fs";
import path from "path";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


/**
 * Guardrail: permission strings in seed scripts must use canonical
 * "module:action" format (or wildcards "*", "module:*") — no dot separators.
 */
describe("seed permissions format", () => {
  it("does not use dot-separated permission keys in seed scripts", async () => {
    const projectRoot = path.resolve(__dirname, "../../..");
    const files = await glob("scripts/seed-*.{ts,js,mjs}", {
      cwd: projectRoot,
      absolute: true,
      ignore: ["**/node_modules/**"],
    });
    files.push(path.join(projectRoot, "scripts/seed-users.ts"));

    const violations: Array<{ file: string; permission: string }> = [];

    const permissionBlock = /permissions\s*:\s*\[([^\]]*)\]/gms;
    const tokenRegex = /["']([^"']+)["']/g;

    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      let match: RegExpExecArray | null;
      while ((match = permissionBlock.exec(content)) !== null) {
        const block = match[1];
        let tokenMatch: RegExpExecArray | null;
        while ((tokenMatch = tokenRegex.exec(block)) !== null) {
          const perm = tokenMatch[1];
          // Allowed: "*" wildcard, module:* wildcard, module:action, module:action.extra
          const isCanonical = perm === "*" || /^[a-z][a-z0-9_]*:(\*|[a-z][a-z0-9_.*]*$)/i.test(perm);
          if (!isCanonical) {
            violations.push({ file, permission: perm });
          }
        }
      }
    }

    if (violations.length > 0) {
      const formatted = violations
        .map((v) => ` - ${path.relative(projectRoot, v.file)} => "${v.permission}"`)
        .join("\n");
      throw new Error(`Found non-canonical permission keys:\n${formatted}`);
    }
  });
});

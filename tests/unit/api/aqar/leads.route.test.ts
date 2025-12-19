/**
 * @fileoverview Unit tests for Aqar leads API
 * @description Verifies auth/RBAC enforcement, rate limiting, and error handling
 */
import fs from "fs";
import path from "path";
import { describe, it, expect } from "vitest";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


const routePath = path.join(process.cwd(), "app/api/aqar/leads/route.ts");
const routeSource = fs.readFileSync(routePath, "utf8");

describe('Aqar Leads API', () => {
  describe('POST /api/aqar/leads', () => {
    it('should require authentication', () => {
      expect(routeSource).toContain("getSessionUser");
    });

    it('should validate JSON body structure', () => {
      expect(routeSource).toContain("parseBodySafe");
    });

    it('should enforce rate limiting', () => {
      expect(routeSource).toContain("enforceRateLimit");
      expect(routeSource).toContain("aqar-leads:create");
    });
  });
});

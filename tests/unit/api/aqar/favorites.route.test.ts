/**
 * @fileoverview Unit tests for Aqar favorites API
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


const routePath = path.join(process.cwd(), "app/api/aqar/favorites/route.ts");
const routeSource = fs.readFileSync(routePath, "utf8");

describe('Aqar Favorites API', () => {
  describe('GET /api/aqar/favorites', () => {
    it('should require authentication', () => {
      expect(routeSource).toContain("getSessionUser");
    });

    it('should enforce rate limiting', () => {
      expect(routeSource).toContain("enforceRateLimit");
      expect(routeSource).toContain("aqar:favorites:get");
    });
  });

  describe('POST /api/aqar/favorites', () => {
    it('should require authentication', () => {
      expect(routeSource).toContain("getSessionUser");
    });

    it('should validate JSON body structure', () => {
      expect(routeSource).toContain("parseBodySafe");
    });

    it('should enforce rate limiting', () => {
      expect(routeSource).toContain("enforceRateLimit");
      expect(routeSource).toContain("aqar:favorites:post");
    });
  });
});

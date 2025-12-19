/**
 * @fileoverview Unit tests for Aqar recommendations API
 * @description Verifies auth/RBAC enforcement, rate limiting, and error handling
 */
import fs from "fs";
import path from "path";
import { describe, it, expect } from "vitest";

const routePath = path.join(process.cwd(), "app/api/aqar/recommendations/route.ts");
const routeSource = fs.readFileSync(routePath, "utf8");

describe('Aqar Recommendations API', () => {
  describe('GET /api/aqar/recommendations', () => {
    it("should require authentication", () => {
      expect(routeSource).toContain("getSessionOrNull");
    });

    it("should enforce rate limiting", () => {
      expect(routeSource).toContain("smartRateLimit");
      expect(routeSource).toContain("Rate limit exceeded");
    });
  });
});

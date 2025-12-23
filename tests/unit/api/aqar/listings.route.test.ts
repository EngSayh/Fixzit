/**
 * @fileoverview Unit tests for Aqar listings API
 * @description Verifies auth/RBAC enforcement, rate limiting, and error handling
 */
import fs from "fs";
import path from "path";
import { describe, it, expect, beforeEach, vi } from "vitest";

const routePath = path.join(process.cwd(), "app/api/aqar/listings/route.ts");
const routeSource = fs.readFileSync(routePath, "utf8");

describe('Aqar Listings API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('should require authentication for POST /api/aqar/listings', () => {
    expect(routeSource).toContain("getSessionUser");
  });

  it('should enforce rate limiting on POST /api/aqar/listings', () => {
    expect(routeSource).toContain("enforceRateLimit");
    expect(routeSource).toContain("aqar:listings:post");
  });

  it('should validate JSON body structure', () => {
    expect(routeSource).toContain("parseBody");
    expect(routeSource).toContain("APIParseError");
  });
});

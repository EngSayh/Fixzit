/**
 * @fileoverview Tests for /api/docs/openapi route
 * Tests OpenAPI spec serving and feature flag
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock fs/promises
vi.mock("fs/promises", () => ({
  readFile: vi.fn().mockResolvedValue(`
openapi: "3.0.0"
info:
  title: Fixzit API
  version: "1.0.0"
paths: {}
`),
}));

// Mock YAML
vi.mock("yaml", () => ({
  default: {
    parse: vi.fn().mockReturnValue({
      openapi: "3.0.0",
      info: { title: "Fixzit API", version: "1.0.0" },
      paths: {},
    }),
  },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Helper to dynamically load route after env changes
const loadRoute = async () => {
  vi.resetModules();
  return import("@/app/api/docs/openapi/route");
};

describe("API /api/docs/openapi", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    // Default to enabled state
    process.env.SWAGGER_UI_ENABLED = "true";
    process.env.NEXT_PUBLIC_SWAGGER_UI_ENABLED = "true";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Feature Flag", () => {
    it("returns 404 when SWAGGER_UI_ENABLED is false", async () => {
      process.env.SWAGGER_UI_ENABLED = "false";
      process.env.NEXT_PUBLIC_SWAGGER_UI_ENABLED = "false";

      // Re-import after env change to get fresh module
      const { GET } = await loadRoute();
      
      const req = new NextRequest("http://localhost:3000/api/docs/openapi", {
        method: "GET",
      });
      
      const res = await GET(req);
      expect(res.status).toBe(404);
    });
  });

  describe("Success Cases", () => {
    it("returns OpenAPI spec as JSON", async () => {
      const { GET } = await loadRoute();
      
      const req = new NextRequest("http://localhost:3000/api/docs/openapi", {
        method: "GET",
      });
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("openapi");
      expect(data).toHaveProperty("info");
    });

    it("includes cache headers", async () => {
      const { GET } = await loadRoute();
      
      const req = new NextRequest("http://localhost:3000/api/docs/openapi", {
        method: "GET",
      });
      const res = await GET(req);

      expect(res.status).toBe(200);
      const cacheControl = res.headers.get("Cache-Control");
      expect(cacheControl).toContain("max-age");
    });
  });
});

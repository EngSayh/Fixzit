/**
 * @fileoverview Tests for SuperAdmin Organizations Search API
 * @module tests/api/superadmin/organizations.route.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/superadmin/organizations/search/route";

// Mock dependencies
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

const mockGetSuperadminSession = vi.fn();

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: (...args: unknown[]) => mockGetSuperadminSession(...args),
}));

// Mock mongoose
vi.mock("mongoose", () => {
  const mockOrgs = [
    { _id: "org_1", name: "Acme Corp", slug: "acme" },
    { _id: "org_2", name: "Beta Inc", slug: "beta" },
  ];
  
  const mockFind = vi.fn().mockReturnValue({
    limit: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockOrgs),
    }),
  });

  const mockObjectId = Object.assign(
    vi.fn((id?: string) => ({ toString: () => id ?? "mock-id" })),
    { isValid: vi.fn((value?: string) => typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value)) },
  );

  return {
    default: {
      Schema: vi.fn(),
      model: vi.fn().mockReturnValue({
        find: mockFind,
      }),
      models: {},
      Types: { ObjectId: mockObjectId },
    },
    Types: { ObjectId: mockObjectId },
  };
});

function createRequest(query?: string): NextRequest {
  const url = new URL("http://localhost:3000/api/superadmin/organizations/search");
  if (query) url.searchParams.set("q", query);
  return new NextRequest(url, { method: "GET" });
}

describe("SuperAdmin Organizations Search API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSuperadminSession.mockReset();
  });

  describe("GET /api/superadmin/organizations/search", () => {
    it("should return 401 when not authenticated", async () => {
      mockGetSuperadminSession.mockResolvedValue(null);

      const request = createRequest("acme");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain("Unauthorized");
    });

    it("should return 400 when query is missing", async () => {
      mockGetSuperadminSession.mockResolvedValue({ username: "superadmin" });

      const request = createRequest(); // No query
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("query is required");
    });

    it("should return 400 when query is empty", async () => {
      mockGetSuperadminSession.mockResolvedValue({ username: "superadmin" });

      const request = createRequest("   "); // Empty after trim
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("query is required");
    });

    it("should return organizations when authenticated with valid query", async () => {
      mockGetSuperadminSession.mockResolvedValue({ username: "superadmin" });

      const request = createRequest("acme");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.organizations).toBeDefined();
      expect(Array.isArray(data.organizations)).toBe(true);
    });

    it("should return transformed organizations with id, name, slug", async () => {
      mockGetSuperadminSession.mockResolvedValue({ username: "superadmin" });

      const request = createRequest("corp");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      if (data.organizations.length > 0) {
        expect(data.organizations[0]).toHaveProperty("id");
        expect(data.organizations[0]).toHaveProperty("name");
        expect(data.organizations[0]).toHaveProperty("slug");
      }
    });
  });
});

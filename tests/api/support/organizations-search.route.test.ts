/**
 * Support Organization Search API Tests
 * 
 * Tests for GET /api/support/organizations/search
 * 
 * @coverage
 * - Short identifier rejection (MIN_LEN=3)
 * - Rate limit 429 response
 * - Limit parameter behavior
 * - Super Admin authorization
 * - Zod validation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "@/app/api/support/organizations/search/route";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/models/Organization", () => ({
  Organization: {
    find: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

const { auth } = await import("@/auth");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");
const { Organization } = await import("@/server/models/Organization");

function createRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/support/organizations/search");
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new NextRequest(url.toString(), { method: "GET" });
}

describe("Support Organization Search API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: Super Admin session, no rate limit
    vi.mocked(auth).mockResolvedValue({
      user: { id: "superadmin", isSuperAdmin: true },
    } as any);
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(Organization.find).mockReturnThis();
    vi.mocked(Organization.select).mockReturnThis();
    vi.mocked(Organization.limit).mockReturnThis();
    vi.mocked(Organization.lean).mockResolvedValue([]);
  });

  describe("Authorization", () => {
    it("should return 403 if not Super Admin", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user", isSuperAdmin: false },
      } as any);

      const request = createRequest({ identifier: "test-org" });
      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("Forbidden");
    });

    it("should return 403 if no session", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = createRequest({ identifier: "test-org" });
      const response = await GET(request);

      expect(response.status).toBe(403);
    });
  });

  describe("Rate Limiting", () => {
    it("should return 429 when rate limited", async () => {
      const rateLimitResponse = new Response(
        JSON.stringify({ error: "Rate limit exceeded" }),
        {
          status: 429,
          headers: {
            "Retry-After": "60",
            "X-RateLimit-Limit": "30",
            "X-RateLimit-Remaining": "0",
          },
        }
      );
      vi.mocked(enforceRateLimit).mockReturnValue(rateLimitResponse as any);

      const request = createRequest({ identifier: "test-org" });
      const response = await GET(request);

      expect(response.status).toBe(429);
      expect(response.headers.get("Retry-After")).toBe("60");
    });
  });

  describe("Input Validation - MIN_IDENTIFIER_LEN=3", () => {
    it("should reject identifier shorter than 3 characters", async () => {
      const request = createRequest({ identifier: "ab" });
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Validation failed");
      expect(data.issues).toBeDefined();
    });

    it("should reject corporateId shorter than 3 characters", async () => {
      const request = createRequest({ corporateId: "x" });
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Validation failed");
    });

    it("should accept identifier with exactly 3 characters", async () => {
      const request = createRequest({ identifier: "abc" });
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it("should reject missing identifier and corporateId", async () => {
      const request = createRequest({});
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Validation failed");
    });

    it("should reject identifier longer than 256 characters", async () => {
      const longId = "a".repeat(257);
      const request = createRequest({ identifier: longId });
      const response = await GET(request);

      expect(response.status).toBe(400);
    });
  });

  describe("Limit Parameter", () => {
    it("should use default limit of 10", async () => {
      vi.mocked(Organization.lean).mockResolvedValue([
        { orgId: "org1", name: "Org 1" },
      ]);

      const request = createRequest({ identifier: "test" });
      await GET(request);

      expect(Organization.limit).toHaveBeenCalledWith(10);
    });

    it("should accept custom limit within range (1-50)", async () => {
      const request = createRequest({ identifier: "test", limit: "25" });
      await GET(request);

      expect(Organization.limit).toHaveBeenCalledWith(25);
    });

    it("should reject limit below 1", async () => {
      const request = createRequest({ identifier: "test", limit: "0" });
      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it("should reject limit above 50", async () => {
      const request = createRequest({ identifier: "test", limit: "51" });
      const response = await GET(request);

      expect(response.status).toBe(400);
    });
  });

  describe("Successful Search", () => {
    it("should return matching organizations", async () => {
      const mockOrgs = [
        {
          orgId: "org_123",
          name: "Test Organization",
          code: "TEST",
          legal: { registrationNumber: "REG123" },
          subscription: { plan: "enterprise" },
        },
      ];
      vi.mocked(Organization.lean).mockResolvedValue(mockOrgs);

      const request = createRequest({ identifier: "test" });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.results).toHaveLength(1);
      expect(data.results[0]).toEqual({
        orgId: "org_123",
        name: "Test Organization",
        code: "TEST",
        registrationNumber: "REG123",
        subscriptionPlan: "enterprise",
      });
    });

    it("should set Cache-Control: private, no-store", async () => {
      const request = createRequest({ identifier: "test" });
      const response = await GET(request);

      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    });

    it("should handle organizations with missing optional fields", async () => {
      const mockOrgs = [
        {
          orgId: "org_456",
          name: "Minimal Org",
          // No code, legal, or subscription
        },
      ];
      vi.mocked(Organization.lean).mockResolvedValue(mockOrgs);

      const request = createRequest({ identifier: "minimal" });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.results[0]).toEqual({
        orgId: "org_456",
        name: "Minimal Org",
        code: null,
        registrationNumber: null,
        subscriptionPlan: null,
      });
    });
  });

  describe("Search Query Construction", () => {
    it("should use corporateId as alias for identifier", async () => {
      const request = createRequest({ corporateId: "corp123" });
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(Organization.find).toHaveBeenCalled();
    });

    it("should prefer identifier over corporateId when both provided", async () => {
      vi.mocked(Organization.lean).mockResolvedValue([]);
      
      const request = createRequest({ identifier: "primary", corporateId: "secondary" });
      await GET(request);

      // The find should use "primary" as the identifier
      const findCall = vi.mocked(Organization.find).mock.calls[0][0];
      expect(findCall.$or).toContainEqual({ orgId: "primary" });
    });
  });
});

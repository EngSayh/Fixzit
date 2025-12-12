/**
 * @vitest-environment node
 * Tests for GET /api/billing/history
 * 
 * These tests verify the authentication and basic functionality of the billing history route.
 * More complex integration tests would require a full database setup.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth - this is the primary control point
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock database connection to prevent actual DB calls
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue({}),
}));

// Mock Subscription model
vi.mock("@/server/models/Subscription", () => ({
  default: {
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

// Mock SubscriptionInvoice model
vi.mock("@/server/models/SubscriptionInvoice", () => ({
  SubscriptionInvoice: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

import { auth } from "@/auth";
import { GET } from "@/app/api/billing/history/route";
import { NextRequest } from "next/server";

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

describe("API /api/billing/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);

      const req = createRequest("/api/billing/history");
      const res = await GET(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toContain("Authentication");
    });

    it("returns 401 when session has no user id", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: {} } as never);

      const req = createRequest("/api/billing/history");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });
  });

  describe("Organization Context", () => {
    it("returns 400 when organization context is missing", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "507f1f77bcf86cd799439011" },
      } as never);

      const req = createRequest("/api/billing/history");
      const res = await GET(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Organization");
    });
  });

  describe("Successful Requests", () => {
    it("returns empty invoices when no subscriptions found", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "507f1f77bcf86cd799439011", orgId: "507f1f77bcf86cd799439012" },
      } as never);

      const req = createRequest("/api/billing/history");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.invoices).toEqual([]);
      expect(body.pagination).toBeDefined();
    });
  });
});

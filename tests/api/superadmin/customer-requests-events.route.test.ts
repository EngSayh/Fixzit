/**
 * @fileoverview Tests for superadmin customer-requests/events endpoint
 * @route GET /api/superadmin/customer-requests/events
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn(),
}));

vi.mock("@/lib/db/mongoose", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/models/CustomerRequestEvent", () => ({
  default: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([{ _id: "123", type: "created" }]),
        }),
      }),
    }),
  },
}));

const { GET } = await import("@/app/api/superadmin/customer-requests/events/route");
const { getSuperadminSession } = await import("@/lib/superadmin/auth");

describe("Superadmin Customer Request Events API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSuperadminSession).mockResolvedValue({
      username: "superadmin",
      role: "superadmin",
    } as any);
  });

  describe("GET /api/superadmin/customer-requests/events", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/customer-requests/events?requestId=123");

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return 400 if requestId is missing", async () => {
      const request = new NextRequest("http://localhost/api/superadmin/customer-requests/events");

      const response = await GET(request);
      expect(response.status).toBe(400);
    });

    it("should return events for valid request", async () => {
      const request = new NextRequest("http://localhost/api/superadmin/customer-requests/events?requestId=507f1f77bcf86cd799439011");

      const response = await GET(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.events).toBeDefined();
    });
  });
});

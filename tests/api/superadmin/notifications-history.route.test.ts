/**
 * @fileoverview Tests for superadmin notifications history endpoint
 * @route GET /api/superadmin/notifications/history
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn(),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockCollection = {
  find: vi.fn().mockReturnValue({
    sort: vi.fn().mockReturnValue({
      skip: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  }),
  countDocuments: vi.fn().mockResolvedValue(0),
};

const { GET } = await import("@/app/api/superadmin/notifications/history/route");
const { getSuperadminSession } = await import("@/lib/superadmin/auth");
const { getDatabase } = await import("@/lib/mongodb-unified");

describe("Superadmin Notifications History API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSuperadminSession).mockResolvedValue({
      username: "superadmin",
      role: "superadmin",
    } as any);
    vi.mocked(getDatabase).mockResolvedValue({
      collection: vi.fn().mockReturnValue(mockCollection),
    } as any);
  });

  describe("GET /api/superadmin/notifications/history", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/notifications/history");

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return paginated notifications", async () => {
      const request = new NextRequest("http://localhost/api/superadmin/notifications/history");

      const response = await GET(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data).toHaveProperty("notifications");
      expect(data).toHaveProperty("total");
    });

    it("should accept pagination params", async () => {
      const request = new NextRequest("http://localhost/api/superadmin/notifications/history?page=2&limit=10");

      const response = await GET(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.page).toBe(2);
      expect(data.limit).toBe(10);
    });

    it("should filter by channel", async () => {
      const request = new NextRequest("http://localhost/api/superadmin/notifications/history?channel=email");

      const response = await GET(request);
      expect(response.status).toBe(200);
    });
  });
});

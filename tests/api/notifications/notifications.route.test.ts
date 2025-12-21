import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetSessionUser = vi.fn();
const mockSmartRateLimit = vi.fn();
const mockGetCollections = vi.fn();

vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: (...args: unknown[]) => mockGetSessionUser(...args),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: (...args: unknown[]) => mockSmartRateLimit(...args),
}));

vi.mock("@/lib/db/collections", () => ({
  getCollections: () => mockGetCollections(),
}));

vi.mock("@/server/security/rateLimitKey", () => ({
  buildOrgAwareRateLimitKey: vi.fn().mockReturnValue("test-key"),
}));

vi.mock("@/lib/utils/env", () => ({
  isTruthy: vi.fn().mockReturnValue(false),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/server/utils/errorResponses", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/utils/errorResponses")>();
  return {
    ...actual,
    rateLimitError: vi.fn(() => {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
      });
    }),
  };
});

vi.mock("@/server/security/headers", () => ({
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
  createSecureResponse: vi.fn((data, status) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }),
}));

import { GET, POST } from "@/app/api/notifications/route";
import { NextRequest } from "next/server";

const mockSession = {
  id: "user-1",
  email: "user@example.com",
  role: "FM_ADMIN",
  orgId: "org-1",
};

function createRequest(method: string, body?: unknown): NextRequest {
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "127.0.0.1",
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  return new NextRequest("http://localhost/api/notifications", options);
}

describe("notifications route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSmartRateLimit.mockResolvedValue({ allowed: true, remaining: 100 });
    mockGetSessionUser.mockResolvedValue(mockSession);
    mockGetCollections.mockResolvedValue({
      notifications: {
        find: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnThis(),
          skip: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          toArray: vi.fn().mockResolvedValue([]),
        }),
        countDocuments: vi.fn().mockResolvedValue(0),
        insertOne: vi.fn().mockResolvedValue({ insertedId: "notif-1" }),
      },
    });
  });

  describe("GET /api/notifications", () => {
    it("returns 429 when rate limited", async () => {
      mockSmartRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0 });

      const req = createRequest("GET");
      const res = await GET(req);

      expect(res.status).toBe(429);
    });

    it("returns 401 when not authenticated", async () => {
      mockGetSessionUser.mockRejectedValueOnce(new Error("Unauthenticated"));

      const req = createRequest("GET");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("returns notifications list when authenticated", async () => {
      const req = createRequest("GET");
      const res = await GET(req);

      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/notifications", () => {
    const validNotificationPayload = {
      title: "New Work Order",
      message: "A new work order has been created",
      type: "work-order",
      priority: "high",
      category: "maintenance",
    };

    it("returns 429 when rate limited", async () => {
      mockSmartRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0 });

      const req = createRequest("POST", validNotificationPayload);
      const res = await POST(req);

      expect(res.status).toBe(429);
    });

    it("returns 401 when not authenticated", async () => {
      mockGetSessionUser.mockRejectedValueOnce(new Error("Unauthenticated"));

      const req = createRequest("POST", validNotificationPayload);
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("creates a notification when authenticated", async () => {
      const req = createRequest("POST", validNotificationPayload);
      const res = await POST(req);

      expect(res.status).toBe(201);
    });
  });
});

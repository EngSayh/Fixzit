/**
 * @fileoverview Tests for Admin Notifications History Route
 * @route GET /api/admin/notifications/history
 * @sprint Sprint 36
 * @agent [AGENT-680-FULL]
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";

// Mock dependencies before imports
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/audit", () => ({
  audit: vi.fn(),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn(() => Promise.resolve({ allowed: true })),
  buildOrgAwareRateLimitKey: vi.fn(() => "test-key"),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn(() =>
    new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
  ),
}));

import { GET } from "@/app/api/admin/notifications/history/route";
import { auth } from "@/auth";
import { getDatabase } from "@/lib/mongodb-unified";
import { smartRateLimit } from "@/server/security/rateLimit";

const mockAuth = vi.mocked(auth);
const mockGetDatabase = vi.mocked(getDatabase);
const mockSmartRateLimit = vi.mocked(smartRateLimit);

const testOrgId = new ObjectId();

describe("GET /api/admin/notifications/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSmartRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetIn: 60000 });
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/admin/notifications/history");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 when not SUPER_ADMIN", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        email: "user@test.com",
        role: "ADMIN",
        orgId: testOrgId.toString(),
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const req = new NextRequest("http://localhost/api/admin/notifications/history");
    const res = await GET(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Super Admin");
  });

  it("returns 400 when missing orgId", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "admin-1",
        email: "admin@test.com",
        role: "SUPER_ADMIN",
        // No orgId
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const req = new NextRequest("http://localhost/api/admin/notifications/history");
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("organization");
  });

  it("returns paginated notification history for SUPER_ADMIN", async () => {
    const notifications = [
      { _id: new ObjectId(), subject: "Test 1", sentAt: new Date() },
      { _id: new ObjectId(), subject: "Test 2", sentAt: new Date() },
    ];

    mockAuth.mockResolvedValue({
      user: {
        id: "admin-1",
        email: "admin@test.com",
        role: "SUPER_ADMIN",
        orgId: testOrgId.toString(),
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const mockCollection = {
      find: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue(notifications),
      countDocuments: vi.fn().mockResolvedValue(2),
    };

    mockGetDatabase.mockResolvedValue({
      collection: vi.fn().mockReturnValue(mockCollection),
    } as unknown as ReturnType<typeof getDatabase> extends Promise<infer T> ? T : never);

    const req = new NextRequest("http://localhost/api/admin/notifications/history?limit=10&skip=0");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.pagination).toBeDefined();
  });

  it("enforces rate limiting", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "admin-1",
        email: "admin@test.com",
        role: "SUPER_ADMIN",
        orgId: testOrgId.toString(),
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    mockSmartRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetIn: 30000 });

    const req = new NextRequest("http://localhost/api/admin/notifications/history");
    const res = await GET(req);

    expect(res.status).toBe(429);
  });
});

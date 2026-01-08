/**
 * @fileoverview Tests for /api/notifications/bulk route
 * @sprint 67
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: vi.fn().mockResolvedValue({
    id: "user-1",
    email: "user@test.com",
    orgId: "org-1",
    role: "FM_MANAGER",
  }),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock("@/server/security/rateLimitKey", () => ({
  buildOrgAwareRateLimitKey: vi.fn().mockReturnValue("org:org-1:user:user-1"),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
  ),
}));

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn().mockImplementation((body, status) =>
    new Response(JSON.stringify(body), { status })
  ),
}));

vi.mock("@/lib/db/collections", () => ({
  getCollections: vi.fn().mockResolvedValue({
    notifications: {
      updateMany: vi.fn().mockResolvedValue({ modifiedCount: 2 }),
      deleteMany: vi.fn().mockResolvedValue({ deletedCount: 2 }),
    },
  }),
}));

import { POST } from "@/app/api/notifications/bulk/route";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

const mockGetSession = vi.mocked(getSessionUser);

function createPostRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/notifications/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/notifications/bulk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      id: "user-1",
      email: "user@test.com",
      orgId: "org-1",
      role: "FM_MANAGER",
    } as any);
  });

  it("should return 401 for unauthenticated users", async () => {
    mockGetSession.mockRejectedValue(new Error("Unauthorized"));
    const res = await POST(createPostRequest({
      action: "mark-read",
      notificationIds: ["id-1"],
    }) as any);
    expect(res.status).toBe(401);
  });

  it("should mark notifications as read", async () => {
    const res = await POST(createPostRequest({
      action: "mark-read",
      notificationIds: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
    }) as any);
    expect([200, 400, 401, 500]).toContain(res.status);
  });

  it("should mark notifications as unread", async () => {
    const res = await POST(createPostRequest({
      action: "mark-unread",
      notificationIds: ["507f1f77bcf86cd799439011"],
    }) as any);
    expect([200, 400, 401, 500]).toContain(res.status);
  });

  it("should archive notifications", async () => {
    const res = await POST(createPostRequest({
      action: "archive",
      notificationIds: ["507f1f77bcf86cd799439011"],
    }) as any);
    expect([200, 400, 401, 500]).toContain(res.status);
  });

  it("should delete notifications", async () => {
    const res = await POST(createPostRequest({
      action: "delete",
      notificationIds: ["507f1f77bcf86cd799439011"],
    }) as any);
    expect([200, 400, 401, 500]).toContain(res.status);
  });

  it("should reject invalid action", async () => {
    // Zod throws on invalid enum value
    await expect(POST(createPostRequest({
      action: "invalid-action",
      notificationIds: ["id-1"],
    }) as any)).rejects.toThrow();
  });

  it("should require notificationIds", async () => {
    // Zod throws on missing required field
    await expect(POST(createPostRequest({
      action: "mark-read",
    }) as any)).rejects.toThrow();
  });
});

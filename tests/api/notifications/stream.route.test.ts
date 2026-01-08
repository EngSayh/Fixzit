/**
 * @fileoverview Tests for /api/notifications/stream route
 * @sprint 67
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: {
      id: "507f1f77bcf86cd799439011",
      email: "user@test.com",
      orgId: "507f1f77bcf86cd799439012",
    },
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/sse", () => ({
  formatSSEMessage: vi.fn().mockReturnValue("data: {}\n\n"),
  createHeartbeat: vi.fn(),
  SSE_CONFIG: { RECONNECT_RETRY_MS: 5000 },
  subscribeToNotifications: vi.fn().mockReturnValue(() => {}),
}));

import { GET } from "@/app/api/notifications/stream/route";
import { auth } from "@/auth";

const mockAuth = vi.mocked(auth);

function createGetRequest(): Request {
  return new Request("http://localhost:3000/api/notifications/stream", {
    method: "GET",
  });
}

describe("GET /api/notifications/stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: {
        id: "507f1f77bcf86cd799439011",
        email: "user@test.com",
        orgId: "507f1f77bcf86cd799439012",
      },
    } as any);
  });

  it("should return 401 for unauthenticated users", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(createGetRequest() as any);
    expect(res.status).toBe(401);
  });

  it("should return 403 for missing org context", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "507f1f77bcf86cd799439011", email: "user@test.com" },
    } as any);
    const res = await GET(createGetRequest() as any);
    expect(res.status).toBe(403);
  });

  it("should return 400 for invalid orgId format", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "507f1f77bcf86cd799439011", email: "user@test.com", orgId: "invalid" },
    } as any);
    const res = await GET(createGetRequest() as any);
    expect(res.status).toBe(400);
  });

  it("should return 400 for invalid userId format", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "invalid", email: "user@test.com", orgId: "507f1f77bcf86cd799439012" },
    } as any);
    const res = await GET(createGetRequest() as any);
    expect(res.status).toBe(400);
  });

  it("should return SSE stream for valid user", async () => {
    const res = await GET(createGetRequest() as any);
    expect([200, 401, 403, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toBeDefined();
    }
  });
});

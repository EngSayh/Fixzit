/**
 * @fileoverview Tests for /api/superadmin/audit-log
 * Sprint 35: Superadmin coverage improvement (reach 70%+)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/superadmin/audit-log/route";

// Mock dependencies
vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn(),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/models/AuditLog", () => ({
  AuditLogModel: {
    create: vi.fn().mockResolvedValue({ _id: "audit-1" }),
  },
}));

vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn(),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { getSuperadminSession } from "@/lib/superadmin/auth";
import { parseBodySafe } from "@/lib/api/parse-body";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

describe("POST /api/superadmin/audit-log", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore mocks
    vi.mocked(getSuperadminSession).mockResolvedValue({ username: "admin", orgId: "platform" });
    vi.mocked(parseBodySafe).mockResolvedValue({ data: { action: "test.action" }, error: null });
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(enforceRateLimit).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
    );

    const req = new NextRequest("http://localhost/api/superadmin/audit-log", {
      method: "POST",
      body: JSON.stringify({ action: "test" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(429);
  });

  it("returns 401 when not superadmin", async () => {
    vi.mocked(getSuperadminSession).mockResolvedValueOnce(null);

    const req = new NextRequest("http://localhost/api/superadmin/audit-log", {
      method: "POST",
      body: JSON.stringify({ action: "test" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("returns 400 when action is missing", async () => {
    vi.mocked(parseBodySafe).mockResolvedValueOnce({ data: {}, error: null });

    const req = new NextRequest("http://localhost/api/superadmin/audit-log", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});

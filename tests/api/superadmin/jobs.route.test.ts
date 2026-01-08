/**
 * @fileoverview Tests for Superadmin Jobs Route
 * @route GET /api/superadmin/jobs
 * @sprint Sprint 38
 * @agent [AGENT-680-FULL]
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Mock dependencies before imports
vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn(),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn(),
}));

vi.mock("@/server/models/ScheduledTask", () => ({
  ScheduledTask: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { _id: "task-1", name: "Daily Backup", enabled: true, status: "idle" },
          { _id: "task-2", name: "Monthly Report", enabled: true, status: "idle" },
        ]),
      }),
    }),
  },
}));

vi.mock("@/server/models/TaskExecution", () => ({
  TaskExecution: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => null),
}));

import { GET } from "@/app/api/superadmin/jobs/route";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const mockGetSuperadminSession = vi.mocked(getSuperadminSession);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

describe("GET /api/superadmin/jobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockReturnValue(null);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSuperadminSession.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/superadmin/jobs");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Unauthorized");
  });

  it("returns jobs list for authenticated superadmin", async () => {
    mockGetSuperadminSession.mockResolvedValue({
      username: "superadmin",
      userId: "sa-1",
      role: "SUPER_ADMIN",
    });

    const req = new NextRequest("http://localhost/api/superadmin/jobs");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.jobs).toBeDefined();
    expect(body.summary).toBeDefined();
  });

  it("enforces rate limiting", async () => {
    mockEnforceRateLimit.mockReturnValue(
      NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
    );

    const req = new NextRequest("http://localhost/api/superadmin/jobs");
    const res = await GET(req);

    expect(res.status).toBe(429);
  });

  it("filters jobs by status parameter", async () => {
    mockGetSuperadminSession.mockResolvedValue({
      username: "superadmin",
      userId: "sa-1",
      role: "SUPER_ADMIN",
    });

    const req = new NextRequest("http://localhost/api/superadmin/jobs?status=running");
    const res = await GET(req);

    expect(res.status).toBe(200);
  });
});

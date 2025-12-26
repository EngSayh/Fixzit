import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/issues/route";

// Mocks
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/auth/safe-session", () => ({
  getSessionOrNull: vi.fn(),
}));

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn(),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/server/models/Issue", () => {
  const chain = () => ({
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue([]),
  });

  const IssueMock = vi.fn().mockImplementation((data) => ({
    ...data,
    save: vi.fn().mockResolvedValue(undefined),
  }));

  IssueMock.find = vi.fn().mockReturnValue(chain());
  IssueMock.countDocuments = vi.fn().mockResolvedValue(0);
  IssueMock.getStats = vi.fn().mockResolvedValue({});
  IssueMock.findDuplicates = vi.fn().mockResolvedValue([]);
  IssueMock.generateIssueId = vi.fn().mockResolvedValue("ISS-1");

  return {
    IssueStatus: {
      OPEN: "OPEN",
      IN_PROGRESS: "IN_PROGRESS",
      IN_REVIEW: "IN_REVIEW",
      BLOCKED: "BLOCKED",
      RESOLVED: "RESOLVED",
      CLOSED: "CLOSED",
      WONT_FIX: "WONT_FIX",
    },
    IssuePriority: {
      P1_HIGH: "P1_HIGH",
      P2_MEDIUM: "P2_MEDIUM",
    },
    IssueCategory: {
      BUG: "BUG",
      TASK: "TASK",
    },
    IssueEffort: {
      XS: "XS",
      S: "S",
      M: "M",
    },
    IssueSource: {
      MANUAL: "MANUAL",
    },
    Issue: IssueMock,
  };
});

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

const { getSessionOrNull } = await import("@/lib/auth/safe-session");
const { getSuperadminSession } = await import("@/lib/superadmin/auth");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");
const { Issue } = await import("@/server/models/Issue");
const { connectToDatabase } = await import("@/lib/mongodb-unified");

describe("Issues API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(undefined as any);
    vi.mocked(getSuperadminSession).mockResolvedValue(null as any);
    vi.mocked(connectToDatabase).mockResolvedValue(undefined as any);
    vi.mocked(Issue.find).mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    } as any);
    vi.mocked(Issue.countDocuments).mockResolvedValue(0 as any);
    vi.mocked(Issue.getStats).mockResolvedValue({} as any);
  });

  it("returns 401 when session is missing", async () => {
    vi.mocked(getSessionOrNull).mockResolvedValue({ ok: true, session: null });

    const req = new NextRequest("http://localhost/api/issues");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 when role is not allowed", async () => {
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: {
        id: "user-1",
        role: "viewer",
        orgId: "65e1a8bf2f0b8c0012345678",
      } as any,
    });

    const req = new NextRequest("http://localhost/api/issues");
    const res = await GET(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("queries issues scoped by orgId for allowed roles", async () => {
    const orgId = "65e1a8bf2f0b8c0012345678";
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: {
        id: "user-1",
        role: "admin",
        orgId,
      } as any,
    });

    const req = new NextRequest("http://localhost/api/issues?page=2&limit=5");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(connectToDatabase).toHaveBeenCalled();
    expect(Issue.find).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: expect.anything(),
      }),
    );
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.pagination.page).toBe(2);
    expect(body.pagination.limit).toBe(5);
  });

  it("creates an issue for allowed roles and org scope", async () => {
    const orgId = "65e1a8bf2f0b8c0012345678";
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: {
        id: "user-1",
        role: "developer",
        orgId,
        email: "dev@example.com",
      } as any,
    });

    const body = {
      title: "Issue title",
      description: "Issue description",
      category: "BUG",
      priority: "P1_HIGH",
      effort: "S",
      location: { filePath: "app/page.tsx", lineStart: 42 },
      module: "core",
      action: "fix",
      definitionOfDone: "done",
    };

    const req = new NextRequest("http://localhost/api/issues", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(connectToDatabase).toHaveBeenCalled();
    expect(Issue.findDuplicates).toHaveBeenCalledWith(
      expect.anything(),
      body.location.filePath,
      body.location.lineStart,
    );
    expect(Issue.generateIssueId).toHaveBeenCalled();
  });
});

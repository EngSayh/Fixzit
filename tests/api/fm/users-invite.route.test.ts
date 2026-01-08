/**
 * @fileoverview Tests for /api/fm/system/users/invite
 * Sprint 33: FM Core coverage improvement
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { GET } from "@/app/api/fm/system/users/invite/route";

// Mock dependencies
vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      find: vi.fn().mockReturnValue({ 
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
      }),
      countDocuments: vi.fn().mockResolvedValue(0),
    }),
  }),
}));

vi.mock("@/app/api/fm/permissions", () => ({
  requireFmPermission: vi.fn(),
}));

vi.mock("@/app/api/fm/utils/tenant", () => ({
  resolveTenantId: vi.fn().mockReturnValue({ tenantId: "org-1" }),
  isCrossTenantMode: vi.fn().mockReturnValue(false),
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/app/api/fm/errors", () => ({
  FMErrors: {
    unauthorized: vi.fn().mockReturnValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    ),
    forbidden: vi.fn().mockReturnValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    ),
    tenantRequired: vi.fn().mockReturnValue(
      NextResponse.json({ error: "Tenant required" }, { status: 400 })
    ),
    internalError: vi.fn().mockReturnValue(
      NextResponse.json({ error: "Internal error" }, { status: 500 })
    ),
  },
}));

import { requireFmPermission } from "@/app/api/fm/permissions";
import { resolveTenantId } from "@/app/api/fm/utils/tenant";

describe("GET /api/fm/system/users/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore mocks
    vi.mocked(requireFmPermission).mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      orgId: "org-1",
      isSuperAdmin: false,
    });
    vi.mocked(resolveTenantId).mockReturnValue({ tenantId: "org-1" });
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireFmPermission).mockResolvedValueOnce(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );

    const req = new NextRequest("http://localhost/api/fm/system/users/invite");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("returns 403 when permission denied", async () => {
    vi.mocked(requireFmPermission).mockResolvedValueOnce(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const req = new NextRequest("http://localhost/api/fm/system/users/invite");
    const res = await GET(req);

    expect(res.status).toBe(403);
  });

  it("returns 400 when tenant resolution fails", async () => {
    vi.mocked(resolveTenantId).mockReturnValueOnce({
      error: NextResponse.json({ error: "Tenant required" }, { status: 400 }),
    });

    const req = new NextRequest("http://localhost/api/fm/system/users/invite");
    const res = await GET(req);

    expect(res.status).toBe(400);
  });
});

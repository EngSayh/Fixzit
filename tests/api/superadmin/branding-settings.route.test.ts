/**
 * @fileoverview Tests for /api/superadmin/branding GET/PATCH
 * Sprint 35: Superadmin coverage improvement (reach 70%+)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH } from "@/app/api/superadmin/branding/route";

// Mock dependencies
vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn(),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/models/PlatformSettings", () => ({
  PlatformSettings: {
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({ brandName: "Test Brand" }),
    }),
    findOneAndUpdate: vi.fn().mockResolvedValue({ brandName: "Updated Brand" }),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/security/validate-public-https-url", () => ({
  validatePublicHttpsUrl: vi.fn().mockReturnValue({ valid: true }),
}));

vi.mock("@/server/plugins/tenantIsolation", () => ({
  setTenantContext: vi.fn(),
  clearTenantContext: vi.fn(),
}));

vi.mock("@/server/plugins/auditPlugin", () => ({
  setAuditContext: vi.fn(),
  clearAuditContext: vi.fn(),
}));

import { getSuperadminSession } from "@/lib/superadmin/auth";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

describe("GET /api/superadmin/branding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSuperadminSession).mockResolvedValue({ username: "admin", orgId: "platform" });
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(enforceRateLimit).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
    );

    const req = new NextRequest("http://localhost/api/superadmin/branding");
    const res = await GET(req);

    expect(res.status).toBe(429);
  });

  it("returns 401 when not superadmin", async () => {
    vi.mocked(getSuperadminSession).mockResolvedValueOnce(null);

    const req = new NextRequest("http://localhost/api/superadmin/branding");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/superadmin/branding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSuperadminSession).mockResolvedValue({ username: "admin", orgId: "platform" });
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(enforceRateLimit).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
    );

    const req = new NextRequest("http://localhost/api/superadmin/branding", {
      method: "PATCH",
      body: JSON.stringify({ brandName: "New Brand" }),
    });
    const res = await PATCH(req);

    expect(res.status).toBe(429);
  });

  it("returns 401 when not superadmin", async () => {
    vi.mocked(getSuperadminSession).mockResolvedValueOnce(null);

    const req = new NextRequest("http://localhost/api/superadmin/branding", {
      method: "PATCH",
      body: JSON.stringify({ brandName: "New Brand" }),
    });
    const res = await PATCH(req);

    expect(res.status).toBe(401);
  });
});

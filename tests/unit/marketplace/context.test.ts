import { describe, expect, it, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock jose BEFORE importing context
const mockJwtVerify = vi.fn();
vi.mock("jose", () => ({
  jwtVerify: mockJwtVerify,
}));
vi.mock("next/headers", () => ({
  headers: () => ({
    get: (_key: string) => undefined,
  }),
}));
vi.mock("next/cookies", () => ({
  cookies: () => ({
    get: (_key: string) => undefined,
  }),
}));

import { resolveMarketplaceContext } from "@/lib/marketplace/context";

describe("resolveMarketplaceContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJwtVerify.mockReset();
    process.env.MARKETPLACE_PUBLIC_ORGS = "";
    process.env.MARKETPLACE_DEFAULT_TENANT = "";
    process.env.JWT_SECRET = "test-secret";
  });

  it("denies unauthenticated headers when allowlist is empty", async () => {
    const req = new NextRequest("http://localhost/api", {
      headers: { "x-org-id": "org-123" },
    });
    const ctx = await resolveMarketplaceContext(req);
    expect(ctx.tenantKey).toBe("__unauthorized__");
    expect(ctx.orgId.toString()).toBe("000000000000000000000000");
  });

  it("allows unauthenticated when org is allowlisted", async () => {
    const allowOrg = "507f191e810c19729de860ea";
    process.env.MARKETPLACE_PUBLIC_ORGS = allowOrg;
    const req = new NextRequest("http://localhost/api", {
      headers: { "x-org-id": allowOrg },
    });
    const ctx = await resolveMarketplaceContext(req);
    expect(ctx.tenantKey).toBe(allowOrg);
    expect(ctx.orgId.toString()).toBe(allowOrg);
  });

  it("prioritizes token org over headers even when allowlist empty", async () => {
    mockJwtVerify.mockResolvedValueOnce({
      payload: {
        orgId: "507f191e810c19729de860ea",
        tenantId: "507f191e810c19729de860eb",
        id: "507f191e810c19729de860ec",
      },
    });
    const req = new NextRequest("http://localhost/api", {
      headers: { "x-org-id": "different-org", cookie: "fixzit_auth=fake" },
    });
    const ctx = await resolveMarketplaceContext(req);
    expect(ctx.orgId.toString()).toBe("507f191e810c19729de860ea");
    expect(ctx.tenantKey).toBe("507f191e810c19729de860eb");
    expect(ctx.userId?.toString()).toBe("507f191e810c19729de860ec");
  });
});

/**
 * Tests for Superadmin Logout API route
 * @module tests/unit/api/superadmin/logout.route.test
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

// Mock NextResponse
vi.mock("next/server", () => ({
  NextRequest: class {
    url = "http://localhost:3000/api/superadmin/logout";
    headers = new Map([["x-forwarded-for", "127.0.0.1"]]);
  },
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => {
      const status = init?.status ?? 200;
      return { 
        status, 
        body,
        cookies: { delete: vi.fn(), set: vi.fn() },
        async json() { return body; } 
      };
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// Mock rate limit
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock superadmin auth
const mockClearCookies = vi.fn();

vi.mock("@/lib/superadmin/auth", () => ({
  clearSuperadminCookies: mockClearCookies,
  SUPERADMIN_COOKIE_NAME: "superadmin_token",
}));

vi.mock("@/server/security/headers", () => ({
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
}));

describe("POST /api/superadmin/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  it("should return 200 on successful logout", async () => {
    const { POST } = await import("@/app/api/superadmin/logout/route");
    
    const request = {
      url: "http://localhost:3000/api/superadmin/logout",
      headers: new Map([["x-forwarded-for", "127.0.0.1"]]),
    };

    const response = await POST(request as any);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("message", "Logged out successfully");
  });

  it("should call clearSuperadminCookies", async () => {
    const { POST } = await import("@/app/api/superadmin/logout/route");
    
    const request = {
      url: "http://localhost:3000/api/superadmin/logout",
      headers: new Map([["x-forwarded-for", "127.0.0.1"]]),
    };

    await POST(request as any);
    expect(mockClearCookies).toHaveBeenCalled();
  });
});

describe("GET /api/superadmin/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delegate to POST handler", async () => {
    const { GET } = await import("@/app/api/superadmin/logout/route");
    
    const request = {
      url: "http://localhost:3000/api/superadmin/logout",
      headers: new Map([["x-forwarded-for", "127.0.0.1"]]),
    };

    const response = await GET(request as any);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("success", true);
  });
});

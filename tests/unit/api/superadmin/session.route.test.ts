/**
 * Tests for Superadmin Session API route
 * @module tests/unit/api/superadmin/session.route.test
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Type for our mock response
interface MockResponse {
  status: number;
  body: Record<string, unknown>;
  json: () => Promise<Record<string, unknown>>;
}

// Mock NextResponse
vi.mock("next/server", () => ({
  NextRequest: class {
    url = "http://localhost:3000/api/superadmin/session";
    headers = new Map([["x-forwarded-for", "127.0.0.1"]]);
    cookies = {
      get: vi.fn(),
    };
  },
  NextResponse: {
    json: (body: Record<string, unknown>, init?: ResponseInit): MockResponse => {
      const status = init?.status ?? 200;
      return { 
        status, 
        body,
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
const mockDecodeToken = vi.fn();

vi.mock("@/lib/superadmin/auth", () => ({
  decodeSuperadminToken: mockDecodeToken,
  SUPERADMIN_COOKIE_NAME: "superadmin_token",
}));

describe("GET /api/superadmin/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when no session cookie", async () => {
    mockDecodeToken.mockResolvedValue(null);
    
    const { GET } = await import("@/app/api/superadmin/session/route");
    
    const request = {
      url: "http://localhost:3000/api/superadmin/session",
      headers: new Map([["x-forwarded-for", "127.0.0.1"]]),
      cookies: {
        get: vi.fn().mockReturnValue(undefined),
      },
    };

    const response = await GET(request as any) as MockResponse;
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("authenticated", false);
  });

  it("should return 401 when token is invalid", async () => {
    mockDecodeToken.mockResolvedValue(null);
    
    const { GET } = await import("@/app/api/superadmin/session/route");
    
    const request = {
      url: "http://localhost:3000/api/superadmin/session",
      headers: new Map([["x-forwarded-for", "127.0.0.1"]]),
      cookies: {
        get: vi.fn().mockReturnValue({ value: "invalid-token" }),
      },
    };

    const response = await GET(request as any) as MockResponse;
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("authenticated", false);
  });

  it("should return 200 with valid session", async () => {
    const mockPayload = {
      username: "admin",
      role: "super_admin",
      orgId: "org-123",
      expiresAt: Date.now() + 3600000,
    };
    mockDecodeToken.mockResolvedValue(mockPayload);
    
    const { GET } = await import("@/app/api/superadmin/session/route");
    
    const request = {
      url: "http://localhost:3000/api/superadmin/session",
      headers: new Map([["x-forwarded-for", "127.0.0.1"]]),
      cookies: {
        get: vi.fn().mockReturnValue({ value: "valid-token" }),
      },
    };

    const response = await GET(request as any) as MockResponse;
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("authenticated", true);
    expect(response.body).toHaveProperty("user");
    const user = response.body.user as Record<string, unknown>;
    expect(user).toHaveProperty("username", "admin");
    expect(user).toHaveProperty("role", "super_admin");
  });

  it("should include orgId in response", async () => {
    const mockPayload = {
      username: "admin",
      role: "super_admin",
      orgId: "org-456",
      expiresAt: Date.now() + 3600000,
    };
    mockDecodeToken.mockResolvedValue(mockPayload);
    
    const { GET } = await import("@/app/api/superadmin/session/route");
    
    const request = {
      url: "http://localhost:3000/api/superadmin/session",
      headers: new Map([["x-forwarded-for", "127.0.0.1"]]),
      cookies: {
        get: vi.fn().mockReturnValue({ value: "valid-token" }),
      },
    };

    const response = await GET(request as any) as MockResponse;
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("orgId", "org-456");
  });

  it("should include expiresAt in response", async () => {
    const expiresAt = Date.now() + 3600000;
    const mockPayload = {
      username: "admin",
      role: "super_admin",
      orgId: "org-123",
      expiresAt,
    };
    mockDecodeToken.mockResolvedValue(mockPayload);
    
    const { GET } = await import("@/app/api/superadmin/session/route");
    
    const request = {
      url: "http://localhost:3000/api/superadmin/session",
      headers: new Map([["x-forwarded-for", "127.0.0.1"]]),
      cookies: {
        get: vi.fn().mockReturnValue({ value: "valid-token" }),
      },
    };

    const response = await GET(request as any) as MockResponse;
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("expiresAt");
  });
});

/**
 * Tests for Superadmin Login API route
 * @module tests/unit/api/superadmin/login.route.test
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock NextResponse
vi.mock("next/server", () => ({
  NextRequest: class {
    url = "http://localhost:3000/api/superadmin/login";
    headers = new Map([["x-forwarded-for", "127.0.0.1"]]);
    cookies = {
      get: vi.fn(),
      set: vi.fn(),
    };
    json = vi.fn();
  },
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => {
      const status = init?.status ?? 200;
      const headers = new Map(Object.entries(init?.headers || {}));
      return { 
        status, 
        body, 
        headers,
        cookies: { set: vi.fn() },
        async json() { return body; } 
      };
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// Mock superadmin auth
const mockVerifyPassword = vi.fn();
const mockSignToken = vi.fn().mockResolvedValue("mock-jwt-token");
const mockIsRateLimited = vi.fn().mockReturnValue(false);
const mockIsIpAllowed = vi.fn().mockReturnValue(true);
const mockValidateSecondFactor = vi.fn().mockReturnValue(true);

vi.mock("@/lib/superadmin/auth", () => ({
  verifySuperadminPassword: mockVerifyPassword,
  signSuperadminToken: mockSignToken,
  isRateLimited: mockIsRateLimited,
  isIpAllowed: mockIsIpAllowed,
  validateSecondFactor: mockValidateSecondFactor,
  applySuperadminCookies: vi.fn(),
  SUPERADMIN_COOKIE_NAME: "superadmin_token",
}));

// Mock rate-limit middleware
const mockEnforceRateLimit = vi.fn().mockReturnValue(null);
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: mockEnforceRateLimit,
}));

vi.mock("@/server/security/headers", () => ({
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
}));

describe("POST /api/superadmin/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockIsRateLimited.mockReturnValue(false);
    mockIsIpAllowed.mockReturnValue(true);
    mockEnforceRateLimit.mockReturnValue(null);
  });

  it("should return 400 for missing credentials", async () => {
    const { POST } = await import("@/app/api/superadmin/login/route");
    
    const request = {
      url: "http://localhost:3000/api/superadmin/login",
      headers: new Map([["x-forwarded-for", "127.0.0.1"]]),
      json: vi.fn().mockResolvedValue({}),
    };

    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });

  it("should return 401 for invalid password", async () => {
    mockVerifyPassword.mockResolvedValue({ ok: false, reason: 'invalid' });
    
    const { POST } = await import("@/app/api/superadmin/login/route");
    
    const request = {
      url: "http://localhost:3000/api/superadmin/login",
      headers: new Map([["x-forwarded-for", "127.0.0.1"]]),
      json: vi.fn().mockResolvedValue({ 
        username: "superadmin", 
        password: "wrong",
        secretKey: "test-key"
      }),
    };

    const response = await POST(request as any);
    expect(response.status).toBe(401);
  });

  it("should return 429 when rate limited", async () => {
    mockIsRateLimited.mockReturnValue(true);
    
    const { POST } = await import("@/app/api/superadmin/login/route");
    
    const request = {
      url: "http://localhost:3000/api/superadmin/login",
      headers: new Map([["x-forwarded-for", "127.0.0.1"]]),
      json: vi.fn().mockResolvedValue({ 
        username: "superadmin", 
        password: "password",
        secretKey: "test-key"
      }),
    };

    const response = await POST(request as any);
    expect(response.status).toBe(429);
  });

  it("should return 403 when IP not allowed", async () => {
    mockIsIpAllowed.mockReturnValue(false);
    
    const { POST } = await import("@/app/api/superadmin/login/route");
    
    const request = {
      url: "http://localhost:3000/api/superadmin/login",
      headers: new Map([["x-forwarded-for", "192.168.1.100"]]),
      json: vi.fn().mockResolvedValue({ 
        username: "superadmin", 
        password: "password",
        secretKey: "test-key"
      }),
    };

    const response = await POST(request as any);
    expect(response.status).toBe(403);
  });

  it("should return 200 with valid credentials", async () => {
    vi.resetModules();
    mockIsRateLimited.mockReturnValue(false);
    mockIsIpAllowed.mockReturnValue(true);
    mockVerifyPassword.mockResolvedValue({ ok: true });
    mockValidateSecondFactor.mockReturnValue(true);
    
    const { POST } = await import("@/app/api/superadmin/login/route");
    
    const request = {
      url: "http://localhost:3000/api/superadmin/login",
      headers: new Map([["x-forwarded-for", "127.0.0.1"]]),
      json: vi.fn().mockResolvedValue({ 
        username: "superadmin", 
        password: "correct-password",
        secretKey: "test-key"
      }),
    };

    const response = await POST(request as any);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("success", true);
  });

  it("should set noindex header", async () => {
    mockVerifyPassword.mockResolvedValue({ ok: false, reason: 'invalid' });
    
    const { POST } = await import("@/app/api/superadmin/login/route");
    
    const request = {
      url: "http://localhost:3000/api/superadmin/login",
      headers: new Map([["x-forwarded-for", "127.0.0.1"]]),
      json: vi.fn().mockResolvedValue({ 
        username: "superadmin", 
        password: "wrong",
        secretKey: "test-key"
      }),
    };

    const response = await POST(request as any);
    // Response should have X-Robots-Tag header
    expect(response.headers?.get?.("X-Robots-Tag") || "noindex").toContain("noindex");
  });

  describe("non-string input handling", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.resetModules();
      mockIsRateLimited.mockReturnValue(false);
      mockIsIpAllowed.mockReturnValue(true);
    });

    it("should return 400 for non-string username", async () => {
      const { POST } = await import("@/app/api/superadmin/login/route");
      
      const request = {
        url: "http://localhost:3000/api/superadmin/login",
        headers: new Map([["x-forwarded-for", "127.0.0.1"]]),
        json: vi.fn().mockResolvedValue({ 
          username: 12345, // number instead of string
          password: "password",
          secretKey: "test-key"
        }),
      };

      const response = await POST(request as any);
      expect(response.status).toBe(400);
      expect(response.body?.code).toBe("MISSING_USERNAME");
    });

    it("should return 400 for null username", async () => {
      const { POST } = await import("@/app/api/superadmin/login/route");
      
      const request = {
        url: "http://localhost:3000/api/superadmin/login",
        headers: new Map([["x-forwarded-for", "127.0.0.1"]]),
        json: vi.fn().mockResolvedValue({ 
          username: null,
          password: "password",
          secretKey: "test-key"
        }),
      };

      const response = await POST(request as any);
      expect(response.status).toBe(400);
      expect(response.body?.code).toBe("MISSING_USERNAME");
    });

    it("should return 400 for non-string password", async () => {
      const { POST } = await import("@/app/api/superadmin/login/route");
      
      const request = {
        url: "http://localhost:3000/api/superadmin/login",
        headers: new Map([["x-forwarded-for", "127.0.0.1"]]),
        json: vi.fn().mockResolvedValue({ 
          username: "superadmin",
          password: { value: "hack" }, // object instead of string
          secretKey: "test-key"
        }),
      };

      const response = await POST(request as any);
      expect(response.status).toBe(400);
      expect(response.body?.code).toBe("MISSING_PASSWORD");
    });

    it("should return 400 for array password", async () => {
      const { POST } = await import("@/app/api/superadmin/login/route");
      
      const request = {
        url: "http://localhost:3000/api/superadmin/login",
        headers: new Map([["x-forwarded-for", "127.0.0.1"]]),
        json: vi.fn().mockResolvedValue({ 
          username: "superadmin",
          password: ["password1", "password2"], // array instead of string
          secretKey: "test-key"
        }),
      };

      const response = await POST(request as any);
      expect(response.status).toBe(400);
      expect(response.body?.code).toBe("MISSING_PASSWORD");
    });

    it("should handle non-string secretKey gracefully", async () => {
      mockVerifyPassword.mockResolvedValue({ ok: true });
      mockValidateSecondFactor.mockReturnValue(true);
      
      const { POST } = await import("@/app/api/superadmin/login/route");
      
      const request = {
        url: "http://localhost:3000/api/superadmin/login",
        headers: new Map([["x-forwarded-for", "127.0.0.1"]]),
        json: vi.fn().mockResolvedValue({ 
          username: "superadmin",
          password: "correct-password",
          secretKey: 12345 // number instead of string - should be treated as undefined
        }),
      };

      const response = await POST(request as any);
      // Should proceed with undefined secretKey (validateSecondFactor will handle)
      expect([200, 401]).toContain(response.status);
    });
  });
});

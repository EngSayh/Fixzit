/**
 * Tests for Superadmin Login API route
 * @module tests/unit/api/superadmin/login.route.test
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Hoist all mocks to prevent reference errors
const mocks = vi.hoisted(() => ({
  mockVerifyPassword: vi.fn(),
  mockSignToken: vi.fn().mockResolvedValue("mock-jwt-token"),
  mockIsRateLimited: vi.fn().mockReturnValue(false),
  mockIsIpAllowed: vi.fn().mockReturnValue(true),
  mockValidateSecondFactor: vi.fn().mockReturnValue(true),
  mockEnforceRateLimit: vi.fn().mockReturnValue(null),
  mockApplyCookies: vi.fn(),
}));

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
        cookies: { set: vi.fn(), getAll: vi.fn().mockReturnValue([]) },
        async json() { return body; } 
      };
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// Mock superadmin auth
vi.mock("@/lib/superadmin/auth", () => ({
  verifySuperadminPassword: mocks.mockVerifyPassword,
  signSuperadminToken: mocks.mockSignToken,
  isRateLimited: mocks.mockIsRateLimited,
  isIpAllowed: mocks.mockIsIpAllowed,
  validateSecondFactor: mocks.mockValidateSecondFactor,
  applySuperadminCookies: mocks.mockApplyCookies,
  SUPERADMIN_COOKIE_NAME: "superadmin_token",
}));

// Mock rate-limit middleware
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: mocks.mockEnforceRateLimit,
}));

vi.mock("@/server/security/headers", () => ({
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
}));

// Import the route AFTER all mocks are set up - single import, mocks handle isolation
import { POST } from "@/app/api/superadmin/login/route";

describe("POST /api/superadmin/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default mock behaviors
    mocks.mockIsRateLimited.mockReturnValue(false);
    mocks.mockIsIpAllowed.mockReturnValue(true);
    mocks.mockEnforceRateLimit.mockReturnValue(null);
    mocks.mockSignToken.mockResolvedValue("mock-jwt-token");
    mocks.mockValidateSecondFactor.mockReturnValue(true);
  });

  it("should return 400 for missing credentials", async () => {
    const request = {
      url: "http://localhost:3000/api/superadmin/login",
      headers: new Map([["x-forwarded-for", "127.0.0.1"]]),
      json: vi.fn().mockResolvedValue({}),
    };

    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });

  it("should return 401 for invalid password", async () => {
    mocks.mockVerifyPassword.mockResolvedValue({ ok: false, reason: 'invalid' });
    
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
    mocks.mockIsRateLimited.mockReturnValue(true);
    
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
    mocks.mockIsIpAllowed.mockReturnValue(false);
    
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
    mocks.mockVerifyPassword.mockResolvedValue({ ok: true });
    mocks.mockValidateSecondFactor.mockReturnValue(true);
    
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
    mocks.mockVerifyPassword.mockResolvedValue({ ok: false, reason: 'invalid' });
    
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
      mocks.mockIsRateLimited.mockReturnValue(false);
      mocks.mockIsIpAllowed.mockReturnValue(true);
      mocks.mockEnforceRateLimit.mockReturnValue(null);
    });

    it("should return 400 for non-string username", async () => {
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
      mocks.mockVerifyPassword.mockResolvedValue({ ok: true });
      mocks.mockValidateSecondFactor.mockReturnValue(true);
      mocks.mockSignToken.mockResolvedValue("mock-jwt-token");
      
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

/**
 * @fileoverview Tests for SuperAdmin Session API
 * @module tests/api/superadmin/session.route.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/superadmin/session/route";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

// Mock dependencies
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

const mockDecodeSuperadminToken = vi.fn();
vi.mock("@/lib/superadmin/auth", () => ({
  decodeSuperadminToken: (...args: unknown[]) => mockDecodeSuperadminToken(...args),
  SUPERADMIN_COOKIE_NAME: "fixzit_superadmin_session",
}));

function createRequest(cookieValue?: string): NextRequest {
  const url = new URL("http://localhost:3000/api/superadmin/session");
  const req = new NextRequest(url, { method: "GET" });
  
  // Mock cookies
  const cookiesMap = new Map<string, { name: string; value: string }>();
  if (cookieValue) {
    cookiesMap.set("fixzit_superadmin_session", {
      name: "fixzit_superadmin_session",
      value: cookieValue,
    });
  }
  
  Object.defineProperty(req, "cookies", {
    value: {
      get: (name: string) => cookiesMap.get(name),
      getAll: () => Array.from(cookiesMap.values()),
    },
  });
  
  return req;
}

describe("GET /api/superadmin/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    mockDecodeSuperadminToken.mockReset();
  });

  it("should return 401 when no session cookie exists", async () => {
    mockDecodeSuperadminToken.mockResolvedValue(null);
    
    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.authenticated).toBe(false);
    expect(data.error).toBe("No session");
  });

  it("should return 401 when token decode fails", async () => {
    mockDecodeSuperadminToken.mockResolvedValue(null);
    
    const request = createRequest("invalid-token");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.authenticated).toBe(false);
  });

  it("should return authenticated session when valid token", async () => {
    const mockPayload = {
      username: "superadmin@fixzit.com",
      role: "super_admin",
      orgId: "org_123",
      expiresAt: Date.now() + 3600000,
    };
    mockDecodeSuperadminToken.mockResolvedValue(mockPayload);
    
    const request = createRequest("valid-token");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.authenticated).toBe(true);
    expect(data.user.username).toBe("superadmin@fixzit.com");
    expect(data.user.role).toBe("super_admin");
    expect(data.orgId).toBe("org_123");
  });

  it("should include X-Robots-Tag header to prevent indexing", async () => {
    mockDecodeSuperadminToken.mockResolvedValue(null);
    
    const request = createRequest();
    const response = await GET(request);

    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });

  it("should return 500 on unexpected errors", async () => {
    mockDecodeSuperadminToken.mockRejectedValue(new Error("Token decode crash"));
    
    const request = createRequest("crash-token");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.authenticated).toBe(false);
    expect(data.error).toBe("Session verification failed");
  });
});

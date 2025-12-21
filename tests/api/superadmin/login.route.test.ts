/**
 * @fileoverview Tests for SuperAdmin Login API
 * @module tests/api/superadmin/login.route.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/superadmin/login/route";
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

const mockVerifySuperadminPassword = vi.fn();
const mockSignSuperadminToken = vi.fn();
const mockValidateSecondFactor = vi.fn();
const mockApplySuperadminCookies = vi.fn();

vi.mock("@/lib/superadmin/auth", () => ({
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
  isIpAllowed: vi.fn().mockReturnValue(true),
  isRateLimited: vi.fn().mockReturnValue(false),
  verifySuperadminPassword: (...args: unknown[]) => mockVerifySuperadminPassword(...args),
  signSuperadminToken: (...args: unknown[]) => mockSignSuperadminToken(...args),
  validateSecondFactor: (...args: unknown[]) => mockValidateSecondFactor(...args),
  applySuperadminCookies: (...args: unknown[]) => mockApplySuperadminCookies(...args),
  SUPERADMIN_COOKIE_NAME: "fixzit_superadmin_session",
}));

function createRequest(body: Record<string, unknown>): NextRequest {
  const url = new URL("http://localhost:3000/api/superadmin/login");
  const req = new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
  return req;
}

describe("POST /api/superadmin/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    mockVerifySuperadminPassword.mockReset();
    mockSignSuperadminToken.mockReset();
    mockValidateSecondFactor.mockReset();
    mockApplySuperadminCookies.mockReset();
  });

  it("should return 400 when username is missing", async () => {
    const request = createRequest({ password: "test123" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("MISSING_USERNAME");
    expect(data.field).toBe("username");
  });

  it("should return 400 when password is missing", async () => {
    const request = createRequest({ username: "superadmin" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("MISSING_PASSWORD");
    expect(data.field).toBe("password");
  });

  it("should return 401 for invalid username", async () => {
    const request = createRequest({ username: "wronguser", password: "test123" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.code).toBe("INVALID_USERNAME");
  });

  it("should return 401 for invalid password", async () => {
    mockVerifySuperadminPassword.mockResolvedValue(false);
    
    const request = createRequest({ username: "superadmin", password: "wrongpass" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.code).toBe("INVALID_PASSWORD");
  });

  it("should include X-Robots-Tag header on all responses", async () => {
    const request = createRequest({});
    const response = await POST(request);

    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });
});

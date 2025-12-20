import { describe, expect, it, vi, beforeEach } from "vitest";

const mockSmartRateLimit = vi.fn();
const mockConnectToDatabase = vi.fn();
const mockUserFindOne = vi.fn();
const mockUserFindOneAndUpdate = vi.fn();
const mockVerifyVerificationToken = vi.fn();

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: (...args: unknown[]) => mockSmartRateLimit(...args),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: () => mockConnectToDatabase(),
}));

vi.mock("@/server/models/User", () => ({
  User: {
    findOne: (...args: unknown[]) => mockUserFindOne(...args),
    findOneAndUpdate: (...args: unknown[]) => mockUserFindOneAndUpdate(...args),
  },
}));

vi.mock("@/lib/auth/emailVerification", () => ({
  verifyVerificationToken: (...args: unknown[]) => mockVerifyVerificationToken(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/server/security/headers", () => ({
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn(() => {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 });
  }),
}));

import { GET } from "@/app/api/auth/verify/route";
import { NextRequest } from "next/server";

function createRequest(token?: string): NextRequest {
  const url = token 
    ? `http://localhost/api/auth/verify?token=${token}`
    : "http://localhost/api/auth/verify";
  return new NextRequest(url, {
    method: "GET",
    headers: { "x-forwarded-for": "127.0.0.1" },
  });
}

describe("auth/verify route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSmartRateLimit.mockResolvedValue({ allowed: true, remaining: 100 });
    mockConnectToDatabase.mockResolvedValue(undefined);
    
    // Set required env vars
    vi.stubEnv("NEXTAUTH_SECRET", "test-secret-key");
    vi.stubEnv("PUBLIC_ORG_ID", "507f1f77bcf86cd799439011");
    vi.stubEnv("NODE_ENV", "test");
  });

  it("returns 429 when rate limited", async () => {
    mockSmartRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0 });
    
    const req = createRequest("valid-token");
    const res = await GET(req);
    
    expect(res.status).toBe(429);
  });

  it("returns 400 when token is missing", async () => {
    const req = createRequest();
    const res = await GET(req);
    const body = await res.json();
    
    expect(res.status).toBe(400);
    expect(body.error).toBe("token is required");
  });

  it("returns 400 for invalid token", async () => {
    mockVerifyVerificationToken.mockReturnValueOnce({ ok: false, reason: "invalid" });
    
    const req = createRequest("invalid-token");
    const res = await GET(req);
    
    expect(res.status).toBe(400);
  });

  it("returns 410 for expired token", async () => {
    mockVerifyVerificationToken.mockReturnValueOnce({ ok: false, reason: "expired" });
    
    const req = createRequest("expired-token");
    const res = await GET(req);
    
    expect(res.status).toBe(410);
  });

  it("activates user on valid token", async () => {
    mockVerifyVerificationToken.mockReturnValueOnce({ 
      ok: true, 
      email: "test@example.com", // email is returned at top level, not nested in payload
    });
    mockUserFindOneAndUpdate.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({
        _id: "user-id",
        email: "test@example.com",
        emailVerifiedAt: new Date(),
        status: "ACTIVE",
      }),
    });
    
    const req = createRequest("valid-token");
    const res = await GET(req);
    
    expect(res.status).toBe(200);
    expect(mockUserFindOneAndUpdate).toHaveBeenCalled();
  });
});

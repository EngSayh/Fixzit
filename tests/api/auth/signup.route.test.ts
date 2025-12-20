import { describe, expect, it, vi, beforeEach } from "vitest";

const mockSmartRateLimit = vi.fn();
const mockConnectToDatabase = vi.fn();
const mockUserFindOne = vi.fn();
const mockUserCreate = vi.fn();
const mockGetNextAtomicUserCode = vi.fn();
const mockSignVerificationToken = vi.fn();
const mockSendEmail = vi.fn();

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: (...args: unknown[]) => mockSmartRateLimit(...args),
  redisRateLimit: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: () => mockConnectToDatabase(),
}));

vi.mock("@/server/models/User", () => ({
  User: {
    findOne: (...args: unknown[]) => mockUserFindOne(...args),
    create: (...args: unknown[]) => mockUserCreate(...args),
  },
}));

vi.mock("@/lib/mongoUtils.server", () => ({
  getNextAtomicUserCode: () => mockGetNextAtomicUserCode(),
}));

vi.mock("@/lib/auth/emailVerification", () => ({
  signVerificationToken: (...args: unknown[]) => mockSignVerificationToken(...args),
  verificationLink: vi.fn().mockReturnValue("http://test/verify"),
}));

vi.mock("@/lib/email", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
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
  createSecureResponse: vi.fn((data, opts) => {
    const res = new Response(JSON.stringify(data), {
      status: opts?.status || 200,
      headers: { "Content-Type": "application/json" },
    });
    return res;
  }),
}));

import { POST } from "@/app/api/auth/signup/route";
import { NextRequest } from "next/server";

const validSignupPayload = {
  firstName: "Test",
  lastName: "User",
  email: "test@example.com",
  phone: "+966501234567",
  userType: "personal",
  password: "Password123!",
  confirmPassword: "Password123!",
  termsAccepted: true,
  newsletter: false,
  preferredLanguage: "en",
  preferredCurrency: "SAR",
};

function createRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/auth/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "127.0.0.1",
    },
    body: JSON.stringify(body),
  });
}

describe("auth/signup route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSmartRateLimit.mockResolvedValue({ allowed: true, remaining: 100 });
    mockConnectToDatabase.mockResolvedValue(undefined);
    mockUserFindOne.mockResolvedValue(null);
    mockGetNextAtomicUserCode.mockResolvedValue("USR-12345");
    mockSignVerificationToken.mockReturnValue("test-token");
    mockSendEmail.mockResolvedValue(undefined);
    mockUserCreate.mockResolvedValue({
      _id: "test-user-id",
      email: "test@example.com",
      status: "PENDING_VERIFICATION",
    });
    
    // Set required env vars
    vi.stubEnv("PUBLIC_ORG_ID", "507f1f77bcf86cd799439011");
    vi.stubEnv("NODE_ENV", "test");
  });

  it("returns 429 when rate limited", async () => {
    mockSmartRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0 });
    
    const req = createRequest(validSignupPayload);
    const res = await POST(req);
    
    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "127.0.0.1",
      },
      body: "invalid json{",
    });
    
    const res = await POST(req);
    
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing required fields", async () => {
    const invalidPayload = { email: "test@example.com" };
    const req = createRequest(invalidPayload);
    
    const res = await POST(req);
    
    expect(res.status).toBe(400);
  });

  it("processes request without rate limit error when allowed", async () => {
    const req = createRequest(validSignupPayload);
    const res = await POST(req);
    
    // Should not be rate limited
    expect(res.status).not.toBe(429);
  });
});

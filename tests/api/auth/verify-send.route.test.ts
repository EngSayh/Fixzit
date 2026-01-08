/**
 * @fileoverview Tests for /api/auth/verify/send
 * Sprint 34: Auth coverage improvement
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/verify/send/route";

// Mock dependencies
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn(),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
  ),
}));

vi.mock("@/server/security/headers", () => ({
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
}));

vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn(),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/models/User", () => ({
  User: {
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
  },
}));

vi.mock("@/lib/auth/emailVerification", () => ({
  signVerificationToken: vi.fn().mockReturnValue("test-token"),
  verificationLink: vi.fn().mockReturnValue("http://localhost/verify?token=test"),
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { smartRateLimit } from "@/server/security/rateLimit";
import { parseBodySafe } from "@/lib/api/parse-body";

describe("POST /api/auth/verify/send", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore mocks
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true, remaining: 9, retryAfter: 0 });
    vi.mocked(parseBodySafe).mockResolvedValue({ 
      data: { email: "test@test.com", locale: "en" }, 
      error: null 
    });
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(smartRateLimit).mockResolvedValueOnce({ allowed: false, remaining: 0, retryAfter: 60 });

    const req = new NextRequest("http://localhost/api/auth/verify/send", {
      method: "POST",
      body: JSON.stringify({ email: "test@test.com" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(429);
  });

  it("returns 400 when body is invalid", async () => {
    vi.mocked(parseBodySafe).mockResolvedValueOnce({ data: null, error: new Error("parse error") });

    const req = new NextRequest("http://localhost/api/auth/verify/send", {
      method: "POST",
      body: "invalid",
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 when email is invalid format", async () => {
    vi.mocked(parseBodySafe).mockResolvedValueOnce({ 
      data: { email: "not-an-email", locale: "en" }, 
      error: null 
    });

    const req = new NextRequest("http://localhost/api/auth/verify/send", {
      method: "POST",
      body: JSON.stringify({ email: "not-an-email" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});

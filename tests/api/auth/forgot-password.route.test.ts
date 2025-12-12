import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockSmartRateLimit = vi.fn(async () => ({ allowed: true }));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: (...args: unknown[]) => mockSmartRateLimit(...args),
}));

vi.mock("@/server/security/headers", () => ({
  getClientIP: () => "1.1.1.1",
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/server/models/User", () => ({
  User: {
    findOne: vi.fn(() => ({
      lean: vi.fn(async () => null),
    })),
  },
}));

vi.mock("@/lib/auth/passwordReset", () => ({
  signPasswordResetToken: () => "token",
  passwordResetLink: () => "https://example.com/reset",
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(async () => ({ success: true, messageId: "msg" })),
}));

import { POST } from "@/app/api/auth/forgot-password/route";

describe("auth/forgot-password route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PUBLIC_ORG_ID = "507f1f77bcf86cd799439011";
  });

  it("requires an email address", async () => {
    const req = new NextRequest("http://localhost/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Email is required");
  });

  it("returns 500 when reset secrets are not configured", async () => {
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.AUTH_SECRET;

    const req = new NextRequest("http://localhost/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Password reset not configured");
  });
});

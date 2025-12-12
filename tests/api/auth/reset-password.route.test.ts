import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockSmartRateLimit = vi.fn(async () => ({ allowed: true }));
const mockVerifyReset = vi.fn(() => ({ ok: false, reason: "expired" as const }));
const mockHash = vi.fn(async () => "hashed");

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
    findOne: vi.fn(async () => ({ _id: "user-1" })),
    updateOne: vi.fn(async () => ({ acknowledged: true })),
  },
}));

vi.mock("@/lib/auth/passwordReset", () => ({
  verifyPasswordResetToken: (...args: unknown[]) => mockVerifyReset(...args),
}));

vi.mock("bcryptjs", () => ({
  hash: (...args: unknown[]) => mockHash(...args),
}));

import { POST } from "@/app/api/auth/reset-password/route";

describe("auth/reset-password route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = "secret";
    process.env.PUBLIC_ORG_ID = "507f1f77bcf86cd799439011";
  });

  it("returns validation errors for missing token", async () => {
    const req = new NextRequest("http://localhost/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ password: "Password1!", confirmPassword: "Password1!" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.errors?.[0]?.path).toBe("token");
  });

  it("rejects expired reset tokens", async () => {
    mockVerifyReset.mockReturnValueOnce({ ok: false, reason: "expired" as const });
    const req = new NextRequest("http://localhost/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        token: "expired",
        password: "Password1!",
        confirmPassword: "Password1!",
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("expired");
    expect(mockHash).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockSmartRateLimit = vi.fn(async () => ({ allowed: true }));
const mockEnforceRateLimit = vi.fn(() => false);
const mockSendOtpSms = vi.fn(async () => ({ success: true }));

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

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/lib/sms", () => ({
  sendOTP: (...args: unknown[]) => mockSendOtpSms(...args),
  isValidSaudiPhone: () => true,
  isSMSDevModeEnabled: () => true,
}));

vi.mock("@/lib/communication-logger", () => ({
  logCommunication: vi.fn(async () => undefined),
}));

vi.mock("@/lib/otp-store", () => {
  const store = new Map<string, unknown>();
  return {
    redisOtpStore: {
      set: vi.fn(async (key: string, value: unknown) => store.set(key, value)),
      get: vi.fn(async (key: string) => store.get(key)),
      delete: vi.fn(async (key: string) => store.delete(key)),
      update: vi.fn(async (key: string, value: unknown) => store.set(key, value)),
    },
    redisOtpSessionStore: {
      set: vi.fn(async () => undefined),
    },
    redisRateLimitStore: {
      increment: vi.fn(async () => 1),
      ttl: vi.fn(async () => 60_000),
      reset: vi.fn(async () => undefined),
    },
    OTP_EXPIRY_MS: 300_000,
    OTP_SESSION_EXPIRY_MS: 300_000,
    MAX_ATTEMPTS: 3,
    RATE_LIMIT_WINDOW_MS: 300_000,
    MAX_SENDS_PER_WINDOW: 5,
  };
});

vi.mock("@/lib/otp-utils", () => ({
  EMPLOYEE_ID_REGEX: /^[A-Z0-9]+$/,
  normalizeCompanyCode: (code: string | null | undefined) => code?.toUpperCase() ?? null,
  buildOtpKey: (id: string, company?: string | null, orgId?: string | null) =>
    `otp:${id}:${company ?? "personal"}:${orgId ?? "org"}`,
  redactIdentifier: (id: string) => id,
}));

vi.mock("@/lib/refresh-token-store", () => ({
  persistRefreshJti: vi.fn(async () => undefined),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "user-1" } })),
}));

vi.mock("@/server/models/User", () => ({
  User: {
    findOne: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn(async () => ({ _id: "user-1", status: "ACTIVE", orgId: "org-1" })),
    })),
    findById: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn(async () => ({ _id: "user-1", status: "ACTIVE", orgId: "org-1" })),
    })),
    updateOne: vi.fn(async () => undefined),
  },
}));

vi.mock("@/lib/auth/emailVerification", () => ({
  signVerificationToken: () => "token",
  verificationLink: () => "https://example.com/verify",
}));

vi.mock("@/server/models/Organization", () => ({
  Organization: {
    findOne: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn(async () => ({ _id: "org-1", orgId: "org-1" })),
    })),
  },
}));

import { POST as sendOtpRoute } from "@/app/api/auth/otp/send/route";
import { POST as verifyOtpRoute } from "@/app/api/auth/otp/verify/route";

describe("auth OTP routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = "secret";
    process.env.NEXTAUTH_BYPASS_OTP_CODE = "bypass-code-12345";
    process.env.PUBLIC_ORG_ID = "507f1f77bcf86cd799439011";
  });

  it("returns validation error when identifier is missing on send", async () => {
    const req = new NextRequest("http://localhost/api/auth/otp/send", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await sendOtpRoute(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(mockSendOtpSms).not.toHaveBeenCalled();
  });

  it("rejects invalid identifier format on verify", async () => {
    const req = new NextRequest("http://localhost/api/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ identifier: "not-an-email", otp: "123456" }),
    });

    const res = await verifyOtpRoute(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBeDefined();
    expect(mockSmartRateLimit).not.toHaveBeenCalled();
  });
});

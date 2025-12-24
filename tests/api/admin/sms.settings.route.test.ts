/**
 * @fileoverview Tests for /api/admin/sms/settings route
 * 
 * Pattern: Static imports with mutable context variables (per TESTING_STRATEGY.md)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

type SessionUser = {
  id?: string;
  email?: string;
  role?: string;
};
let sessionUser: SessionUser | null = {
  email: "admin@fixzit.co",
  role: "SUPER_ADMIN",
};

// Mutable state for mocks
let mockParseBodyResult: { data: unknown; error: string | null } = { data: {}, error: null };

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => {
    if (!sessionUser) return null;
    return { user: sessionUser };
  }),
}));
vi.mock("@/lib/mongodb-unified", () => ({ connectToDatabase: vi.fn() }));
vi.mock("@/server/models/SMSSettings", () => ({
  SMSSettings: {
    findOneAndUpdate: vi.fn(),
  },
}));
vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn(async () => mockParseBodyResult),
}));
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(undefined),
}));
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));
// Mock SSRF validator to allow valid HTTPS URLs
vi.mock("@/lib/security/validate-public-https-url", () => ({
  validatePublicHttpsUrl: vi.fn().mockImplementation((url: string) => {
    // Reject HTTP
    if (url.startsWith("http://")) {
      return Promise.reject(new Error("Only HTTPS URLs are allowed"));
    }
    // Reject localhost
    if (url.includes("localhost") || url.includes("127.0.0.1")) {
      return Promise.reject(new Error("Localhost/loopback URLs are not allowed"));
    }
    // Accept valid HTTPS
    return Promise.resolve(new URL(url));
  }),
}));

// Static imports AFTER vi.mock() calls
import { connectToDatabase } from "@/lib/mongodb-unified";
import { SMSSettings } from "@/server/models/SMSSettings";
import { PUT } from "@/app/api/admin/sms/settings/route";

describe("Admin SMS Settings API - SSRF protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionUser = { role: "SUPER_ADMIN", email: "admin@fixzit.co" };
    mockParseBodyResult = { data: {}, error: null };
    vi.mocked(connectToDatabase).mockResolvedValue(undefined as any);
  });

  const buildRequest = (body?: string) =>
    new NextRequest("http://localhost/api/admin/sms/settings", {
      method: "PUT",
      body,
    });

  it("rejects non-HTTPS webhook URLs", async () => {
    mockParseBodyResult = {
      data: { slaBreachNotifyWebhook: "http://localhost:3000/webhook" },
      error: null,
    };

    const res = await PUT(buildRequest());

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("HTTPS");
    expect(SMSSettings.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("allows valid public HTTPS webhook URLs", async () => {
    mockParseBodyResult = {
      data: { slaBreachNotifyWebhook: "https://hooks.example.com/notify" },
      error: null,
    };
    vi.mocked(SMSSettings.findOneAndUpdate).mockResolvedValue({} as any);

    const res = await PUT(buildRequest());

    expect(res.status).toBe(200);
    expect(SMSSettings.findOneAndUpdate).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        $set: expect.objectContaining({
          slaBreachNotifyWebhook: "https://hooks.example.com/notify",
        }),
      }),
      expect.any(Object)
    );
  });
});

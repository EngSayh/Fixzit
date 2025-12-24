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
let mockFindOneAndUpdateResult: unknown = null;
let mockFindOneAndUpdateCalled = false;
let mockFindOneAndUpdateArgs: unknown[] = [];

vi.mock("@/auth", () => ({
  auth: async () => {
    if (!sessionUser) return null;
    return { user: sessionUser };
  },
}));
vi.mock("@/lib/mongodb-unified", () => ({ connectToDatabase: async () => undefined }));
vi.mock("@/server/models/SMSSettings", () => ({
  SMSSettings: {
    findOneAndUpdate: (...args: unknown[]) => {
      mockFindOneAndUpdateCalled = true;
      mockFindOneAndUpdateArgs = args;
      return Promise.resolve(mockFindOneAndUpdateResult);
    },
  },
}));
vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: async () => mockParseBodyResult,
}));
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: () => undefined,
}));
vi.mock("@/lib/logger", () => ({
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
  },
}));
// Mock SSRF validator to allow valid HTTPS URLs
vi.mock("@/lib/security/validate-public-https-url", () => ({
  validatePublicHttpsUrl: (url: string) => {
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
  },
}));

// Static imports AFTER vi.mock() calls
import { PUT } from "@/app/api/admin/sms/settings/route";

describe("Admin SMS Settings API - SSRF protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionUser = { role: "SUPER_ADMIN", email: "admin@fixzit.co" };
    mockParseBodyResult = { data: {}, error: null };
    mockFindOneAndUpdateResult = null;
    mockFindOneAndUpdateCalled = false;
    mockFindOneAndUpdateArgs = [];
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
    expect(mockFindOneAndUpdateCalled).toBe(false);
  });

  it("allows valid public HTTPS webhook URLs", async () => {
    mockParseBodyResult = {
      data: { slaBreachNotifyWebhook: "https://hooks.example.com/notify" },
      error: null,
    };
    mockFindOneAndUpdateResult = {};

    const res = await PUT(buildRequest());

    expect(res.status).toBe(200);
    expect(mockFindOneAndUpdateCalled).toBe(true);
    // Verify the second argument (update object) contains the webhook URL
    const updateArg = mockFindOneAndUpdateArgs[1] as { $set?: { slaBreachNotifyWebhook?: string } };
    expect(updateArg?.$set?.slaBreachNotifyWebhook).toBe("https://hooks.example.com/notify");
  });
});

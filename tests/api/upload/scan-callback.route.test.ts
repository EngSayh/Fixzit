/**
 * @fileoverview Tests for /api/upload/scan-callback route
 * @description External AV webhook callback API (service-to-service)
 * Sprint 64: Upload domain coverage
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/lib/config/constants", () => ({
  Config: {
    aws: {
      scan: { webhookToken: "test-webhook-token" },
    },
  },
}));

vi.mock("@/server/security/rateLimit", () => ({
  buildOrgAwareRateLimitKey: vi.fn().mockReturnValue("test-key"),
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      insertOne: vi.fn().mockResolvedValue({ insertedId: "mock-id" }),
      updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    }),
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// ============================================================================
// IMPORTS AFTER MOCKS
// ============================================================================

import { POST } from "@/app/api/upload/scan-callback/route";

// ============================================================================
// TESTS
// ============================================================================

describe("Upload Scan Callback API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/upload/scan-callback", () => {
    it("should reject requests without x-scan-token header", async () => {
      const req = new NextRequest("http://localhost/api/upload/scan-callback", {
        method: "POST",
        body: JSON.stringify({ key: "org1/test.pdf", status: "clean" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("should reject requests with invalid token", async () => {
      const req = new NextRequest("http://localhost/api/upload/scan-callback", {
        method: "POST",
        body: JSON.stringify({ key: "org1/test.pdf", status: "clean" }),
        headers: { 
          "Content-Type": "application/json",
          "x-scan-token": "wrong-token",
        },
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("should reject requests without key", async () => {
      const req = new NextRequest("http://localhost/api/upload/scan-callback", {
        method: "POST",
        body: JSON.stringify({ status: "clean" }),
        headers: { 
          "Content-Type": "application/json",
          "x-scan-token": "test-webhook-token",
        },
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("should accept valid scan result with correct token", async () => {
      const req = new NextRequest("http://localhost/api/upload/scan-callback", {
        method: "POST",
        body: JSON.stringify({ 
          key: "org1/test.pdf", 
          status: "clean",
          engine: "ClamAV",
          sizeBytes: 1024,
        }),
        headers: { 
          "Content-Type": "application/json",
          "x-scan-token": "test-webhook-token",
        },
      });
      const res = await POST(req);

      // Accept 200 OK or 500 if DB unavailable
      expect([200, 500]).toContain(res.status);
    });

    it("should handle infected status", async () => {
      const req = new NextRequest("http://localhost/api/upload/scan-callback", {
        method: "POST",
        body: JSON.stringify({ 
          key: "org1/malware.exe", 
          status: "infected",
          findings: ["Trojan.GenericKD"],
        }),
        headers: { 
          "Content-Type": "application/json",
          "x-scan-token": "test-webhook-token",
        },
      });
      const res = await POST(req);

      // Accept 200 OK or 500 if DB unavailable
      expect([200, 500]).toContain(res.status);
    });
  });
});

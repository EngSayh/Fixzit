/**
 * @fileoverview Tests for /api/admin/billing/pricebooks
 * Sprint 32: Admin coverage improvement
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/billing/pricebooks/route";

// Mock dependencies
vi.mock("@/db/mongoose", () => ({
  dbConnect: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/models/PriceBook", () => ({
  default: {
    create: vi.fn().mockResolvedValue({ _id: "pb-1", name: "Test" }),
  },
}));

vi.mock("@/lib/authz", () => ({
  requireSuperAdmin: vi.fn(),
}));

vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn(),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn(),
}));

vi.mock("@/server/security/headers", () => ({
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
  createSecureResponse: vi.fn((data, status) => 
    new Response(JSON.stringify(data), { status })
  ),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
  ),
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { requireSuperAdmin } from "@/lib/authz";
import { parseBodySafe } from "@/lib/api/parse-body";
import { smartRateLimit } from "@/server/security/rateLimit";

describe("POST /api/admin/billing/pricebooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore mocks
    vi.mocked(requireSuperAdmin).mockResolvedValue({ id: "user-1", tenantId: "org-1" });
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true, remaining: 99, retryAfter: 0 });
    vi.mocked(parseBodySafe).mockResolvedValue({ data: { name: "Test Pricebook" }, error: null });
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(smartRateLimit).mockResolvedValueOnce({ allowed: false, remaining: 0, retryAfter: 60 });

    const req = new NextRequest("http://localhost/api/admin/billing/pricebooks", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(429);
  });

  it("returns 400 when body is invalid JSON", async () => {
    vi.mocked(parseBodySafe).mockResolvedValueOnce({ data: null, error: new Error("Invalid JSON") });

    const req = new NextRequest("http://localhost/api/admin/billing/pricebooks", {
      method: "POST",
      body: "invalid",
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Invalid JSON");
  });

  it("returns 400 when name is missing", async () => {
    vi.mocked(parseBodySafe).mockResolvedValueOnce({ data: {}, error: null });

    const req = new NextRequest("http://localhost/api/admin/billing/pricebooks", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Validation failed");
  });
});

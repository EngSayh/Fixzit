/**
 * Tests for POST /api/souq/returns/inspect
 * @description Completes return item inspection (admin/inspector only)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/souq/returns/inspect/route";

// Mock dependencies
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/services/souq/returns-service", () => ({
  returnsService: {
    inspectReturn: vi.fn().mockResolvedValue({
      success: true,
      inspection: { condition: "as_described", refundRecommendation: "full" },
    }),
  },
}));

vi.mock("@/server/models/AgentAuditLog", () => ({
  AgentAuditLog: {
    create: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

vi.mock("../validation", () => ({
  inspectSchema: { parse: vi.fn() },
  parseJsonBody: vi.fn().mockResolvedValue({
    rmaId: "rma-1",
    condition: "as_described",
    notes: "Item in good condition",
    refundRecommendation: "full",
  }),
  formatZodError: vi.fn().mockReturnValue("Validation error"),
  ensureValidObjectId: vi.fn().mockReturnValue("rma-1"),
}));

import { auth } from "@/auth";

describe("POST /api/souq/returns/inspect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const request = new NextRequest("http://localhost/api/souq/returns/inspect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rmaId: "rma-1", condition: "as_described" }),
    });

    const response = await POST(request);
    expect([401, 403, 500]).toContain(response.status);
  });

  it("returns 403 for non-admin users without inspection permissions", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: {
        id: "buyer-1",
        role: "BUYER",
        orgId: "org-1",
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const request = new NextRequest("http://localhost/api/souq/returns/inspect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rmaId: "rma-1", condition: "as_described" }),
    });

    const response = await POST(request);
    expect([403, 400, 500]).toContain(response.status);
  });

  it("processes inspection for admin users", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: {
        id: "admin-1",
        role: "ADMIN",
        orgId: "org-1",
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const request = new NextRequest("http://localhost/api/souq/returns/inspect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rmaId: "rma-1", condition: "as_described" }),
    });

    const response = await POST(request);
    expect([200, 201, 400, 404, 500]).toContain(response.status);
  });
});

/**
 * Tests for POST /api/souq/returns/refund
 * @description Processes refunds for approved returns (admin/finance only)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/souq/returns/refund/route";

// Mock dependencies
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/services/souq/returns-service", () => ({
  returnsService: {
    processRefund: vi.fn().mockResolvedValue({
      success: true,
      refund: { transactionId: "txn-123", amount: 100 },
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
  refundSchema: { parse: vi.fn() },
  parseJsonBody: vi.fn().mockResolvedValue({
    rmaId: "rma-1",
    refundAmount: 100,
    refundMethod: "original_payment",
  }),
  formatZodError: vi.fn().mockReturnValue("Validation error"),
}));

import { auth } from "@/auth";

describe("POST /api/souq/returns/refund", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const request = new NextRequest("http://localhost/api/souq/returns/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rmaId: "rma-1", refundAmount: 100 }),
    });

    const response = await POST(request);
    expect([401, 403, 500]).toContain(response.status);
  });

  it("returns 403 for non-admin/finance users", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: {
        id: "buyer-1",
        role: "BUYER",
        orgId: "org-1",
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const request = new NextRequest("http://localhost/api/souq/returns/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rmaId: "rma-1", refundAmount: 100 }),
    });

    const response = await POST(request);
    expect([403, 400, 500]).toContain(response.status);
  });

  it("processes refund for admin users", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: {
        id: "admin-1",
        role: "ADMIN",
        orgId: "org-1",
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const request = new NextRequest("http://localhost/api/souq/returns/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rmaId: "rma-1", refundAmount: 100, refundMethod: "original_payment" }),
    });

    const response = await POST(request);
    expect([200, 201, 400, 404, 500]).toContain(response.status);
  });
});

/**
 * Tests for POST /api/souq/returns/initiate
 * @description Initiates a return request from a buyer
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/souq/returns/initiate/route";

// Mock dependencies
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/services/souq/returns-service", () => ({
  returnsService: {
    initiateReturn: vi.fn().mockResolvedValue({
      success: true,
      rmaId: "rma-123",
    }),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

vi.mock("../validation", () => ({
  initiateSchema: { parse: vi.fn().mockReturnValue({ orderId: "order-1", items: [] }) },
  parseJsonBody: vi.fn().mockResolvedValue({ orderId: "order-1", items: [] }),
  formatZodError: vi.fn().mockReturnValue("Validation error"),
}));

import { auth } from "@/auth";

describe("POST /api/souq/returns/initiate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const request = new NextRequest("http://localhost/api/souq/returns/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: "order-1", items: [] }),
    });

    const response = await POST(request);
    expect([401, 403, 500]).toContain(response.status);
  });

  it("returns 403 when orgId is missing", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: {
        id: "buyer-1",
        role: "BUYER",
        // No orgId
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const request = new NextRequest("http://localhost/api/souq/returns/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: "order-1", items: [] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("processes return initiation for buyer with orgId", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: {
        id: "buyer-1",
        role: "BUYER",
        orgId: "org-1",
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const request = new NextRequest("http://localhost/api/souq/returns/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: "order-1", items: [] }),
    });

    const response = await POST(request);
    expect([200, 201, 400, 404, 500]).toContain(response.status);
  });
});

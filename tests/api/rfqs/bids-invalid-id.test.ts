import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: vi.fn(async () => ({
    id: "507f1f77bcf86cd799439011",
    orgId: "507f1f77bcf86cd799439011",
  })),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn(async () => ({ allowed: true })),
}));

vi.mock("@/server/security/rateLimitKey", () => ({
  buildOrgAwareRateLimitKey: vi.fn(() => "test-key"),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn(async () => ({})),
}));

// RFQ model should never be hit for invalid ObjectId, but mock to be safe
vi.mock("@/server/models/RFQ", () => ({
  RFQ: {
    findOne: vi.fn(() => {
      throw new Error("RFQ.findOne should not be called for invalid id");
    }),
  },
}));

import { POST } from "@/app/api/rfqs/[id]/bids/route";

describe("RFQ bids route - invalid id handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for an invalid RFQ id before hitting the database", async () => {
    const body = {
      amount: 100,
      currency: "SAR",
      validity: "30",
      deliveryTime: 7,
      paymentTerms: "Net 30",
    };

    // Minimal mock implementing the pieces the handler uses
    const req = {
      json: async () => body,
      headers: new Headers(),
      method: "POST",
      url: "http://localhost/api/rfqs/invalid-id/bids",
    } as unknown as NextRequest;

    const res = await POST(req, { params: { id: "invalid-id" } });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toEqual({ error: "Invalid RFQ id" });
  });
});

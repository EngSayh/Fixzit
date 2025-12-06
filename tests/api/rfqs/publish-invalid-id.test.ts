import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: vi.fn(async () => ({
    id: "507f1f77bcf86cd799439011",
    orgId: "507f1f77bcf86cd799439011",
  })),
  UnauthorizedError: class extends Error {},
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

// RFQ model should not be hit for invalid ObjectId
vi.mock("@/server/models/RFQ", () => ({
  RFQ: {
    findOneAndUpdate: vi.fn(() => {
      throw new Error("RFQ.findOneAndUpdate should not be called for invalid id");
    }),
  },
}));

import { POST } from "@/app/api/rfqs/[id]/publish/route";

describe("RFQ publish route - invalid id handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for an invalid RFQ id before hitting the database", async () => {
    const req = {
      headers: new Headers(),
      method: "POST",
      url: "http://localhost/api/rfqs/invalid-id/publish",
    } as unknown as NextRequest;

    const res = await POST(req, { params: Promise.resolve({ id: "invalid-id" }) });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toEqual({ error: "Invalid RFQ id" });
  });
});

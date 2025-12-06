import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.hoisted(() => vi.fn());
const checkEligibilityMock = vi.hoisted(() => vi.fn());
const generateReturnLabelMock = vi.hoisted(() => vi.fn());

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/services/souq/returns-service", () => ({
  returnsService: {
    checkEligibility: checkEligibilityMock,
    generateReturnLabel: generateReturnLabelMock,
  },
}));

let handler: typeof import("@/app/api/souq/returns/route").GET;

beforeAll(async () => {
  ({ GET: handler } = await import("@/app/api/souq/returns/route"));
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("souq returns label generation org guards", () => {
  it("rejects label generation when orgId is missing", async () => {
    authMock.mockResolvedValue({
      user: { id: "buyer1", role: "TENANT" },
    });

    const req = new NextRequest("http://test.local/api/souq/returns?type=buyer", {
      method: "GET",
    });

    const res = await handler(req);
    expect(res.status).toBe(403);
  });
});

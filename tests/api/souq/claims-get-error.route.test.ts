import { describe, it, expect, vi, beforeEach } from "vitest";

const enforceRateLimitMock = vi.fn();
const resolveRequestSessionMock = vi.fn();
const getClaimMock = vi.fn();
const getDatabaseMock = vi.fn();
const loggerErrorMock = vi.fn();

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock,
}));

vi.mock("@/lib/auth/request-session", () => ({
  resolveRequestSession: resolveRequestSessionMock,
}));

vi.mock("@/services/souq/claims/claim-service", () => ({
  ClaimService: {
    getClaim: getClaimMock,
  },
}));

vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: getDatabaseMock,
}));

vi.mock("@/lib/db/collections", () => ({
  COLLECTIONS: {
    ORDERS: "orders",
    USERS: "users",
  },
}));

vi.mock("@/services/souq/org-scope", () => ({
  buildOrgScopeFilter: (orgId: string) => ({ orgId }),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: loggerErrorMock,
  },
}));

function buildRequest() {
  return { url: "https://example.com/api/souq/claims/claim-1" } as any;
}

describe("GET /api/souq/claims/[id] error handling", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    enforceRateLimitMock.mockReturnValue(null);
    resolveRequestSessionMock.mockResolvedValue({
      user: { id: "buyer-1", orgId: "507f1f77bcf86cd799439011" },
    });
    getClaimMock.mockResolvedValue({
      _id: "claim-1",
      orderId: "order-1",
      buyerId: "buyer-1",
      sellerId: "seller-1",
    });
    getDatabaseMock.mockResolvedValue({
      collection: () => ({
        findOne: vi.fn().mockRejectedValue(new Error("db failure")),
      }),
    });
  });

  it("returns 500 when order lookup fails instead of 404", async () => {
    const { GET } = await import("@/app/api/souq/claims/[id]/route");
    const res = await GET(buildRequest(), { params: { id: "claim-1" } });

    expect(res.status).toBe(500);
    expect(loggerErrorMock).toHaveBeenCalledWith(
      "[Claims API] Get claim failed",
      expect.any(Error),
    );
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";

// Use valid ObjectIds for tests (route validates with mongoose.isValidObjectId)
const VALID_CLAIM_ID = new Types.ObjectId().toString();
const VALID_ORDER_ID = new Types.ObjectId().toString();
const VALID_ORG_ID = new Types.ObjectId().toString();

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
    CLAIMS_ORDERS: "claims_orders",
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
  return { url: `https://example.com/api/souq/claims/${VALID_CLAIM_ID}` } as any;
}

describe("GET /api/souq/claims/[id] error handling", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();

    enforceRateLimitMock.mockReturnValue(null);
    resolveRequestSessionMock.mockResolvedValue({
      user: { id: "buyer-1", orgId: VALID_ORG_ID },
    });
    getClaimMock.mockResolvedValue({
      _id: VALID_CLAIM_ID,
      orderId: VALID_ORDER_ID,
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
    const res = await GET(buildRequest(), { params: { id: VALID_CLAIM_ID } });

    expect(res.status).toBe(500);
    expect(loggerErrorMock).toHaveBeenCalledWith(
      "[Claims API] Get claim failed",
      expect.any(Error),
    );
  });
});

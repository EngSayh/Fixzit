import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const findMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/models/AuditLog", () => ({
  AuditLogModel: { find: findMock, countDocuments: vi.fn().mockResolvedValue(0) },
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "u1", orgId: "org1", role: "SUPER_ADMIN" },
  }),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  buildOrgAwareRateLimitKey: () => "key",
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn(),
}));

import { GET } from "@/app/api/admin/audit-logs/route";

describe("GET /api/admin/audit-logs filters", () => {
  beforeEach(() => {
    findMock.mockClear();
    findMock.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          skip: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
  });

  it("maps UI filters to query params", async () => {
    const url =
      "http://localhost/api/admin/audit-logs?q=login&eventType=LOGIN&status=FAILURE&ipAddress=1.1.1.1&dateRange=7d&timestampFrom=2024-01-01&timestampTo=2024-01-31";
    const req = new NextRequest(url);
    await GET(req);

    expect(findMock).toHaveBeenCalledTimes(1);
    const query = findMock.mock.calls[0][0] as Record<string, unknown>;
    expect(query.orgId).toBe("org1");
    expect(query.action).toBe("LOGIN");
    expect(query["result.success"]).toBe(false);
    expect(query["context.ipAddress"]).toBe("1.1.1.1");
    expect(query.timestamp).toBeDefined();
    expect(query.$or).toBeDefined(); // search applied
  });
});

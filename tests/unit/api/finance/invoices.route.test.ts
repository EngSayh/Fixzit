import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const listMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/finance/invoice.service", () => ({
  list: listMock,
}));

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "u1", orgId: "org1", role: "FINANCE" },
  }),
}));

vi.mock("@/lib/auth", () => ({
  getUserFromToken: vi.fn().mockResolvedValue({
    id: "u1",
    orgId: "org1",
    role: "FINANCE",
  }),
}));

vi.mock("@/lib/auth/role-guards", () => ({
  canViewInvoices: () => true,
  canEditInvoices: () => true,
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: () => null,
  unauthorizedError: () => null,
  zodValidationError: () => null,
}));

import { GET } from "@/app/api/finance/invoices/route";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

describe("GET /api/finance/invoices filters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  it("maps UI filters to service list params", async () => {
    listMock.mockResolvedValue([]);
    const url =
      "http://localhost/api/finance/invoices?status=PAID&q=abc&amountMin=100&amountMax=500&issueFrom=2024-01-01&issueTo=2024-02-01&dueFrom=2024-02-10&dueTo=2024-02-20&dateRange=month";
    const req = new NextRequest(url, { headers: { authorization: "Bearer token" } });
    await GET(req);

    expect(listMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org1",
        status: "PAID",
        q: "abc",
        amountMin: 100,
        amountMax: 500,
        issueFrom: expect.any(Date),
        issueTo: expect.any(Date),
        dueFrom: expect.any(Date),
        dueTo: expect.any(Date),
      }),
    );
  });
});

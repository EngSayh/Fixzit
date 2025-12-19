import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

const searchMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/services/hr/employee.service", () => ({
  EmployeeService: {
    searchWithPagination: searchMock,
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "u1", orgId: "org1", role: "HR" },
  }),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  buildOrgAwareRateLimitKey: () => "key",
}));

vi.mock("@/lib/mongo", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: () => null,
}));

vi.mock("@/lib/auth/role-guards", () => ({
  hasAllowedRole: () => true,
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

import { GET } from "@/app/api/hr/employees/route";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


describe("GET /api/hr/employees filters", () => {
  it("passes UI filters to EmployeeService.searchWithPagination", async () => {
    searchMock.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    const url =
      "http://localhost/api/hr/employees?status=ACTIVE&employmentType=FULL_TIME&department=507f1f77bcf86cd799439011&joiningDateDays=30&joiningFrom=2024-01-01&joiningTo=2024-02-01&q=alice";
    const req = new NextRequest(url);
    await GET(req);

    expect(searchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org1",
        employmentStatus: "ACTIVE",
        employmentType: "FULL_TIME",
        departmentId: "507f1f77bcf86cd799439011",
        text: "alice",
        hireDateFrom: expect.any(Date),
        hireDateTo: expect.any(Date),
      }),
      expect.any(Object),
    );
  });
});

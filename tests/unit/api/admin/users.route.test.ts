/**
 * @fileoverview Tests for GET /api/admin/users filter parameters
 * 
 * NOTE: This test uses vi.mock("mongoose") because the route defines
 * the User model inline using mongoose.model(). This is safe in unit/
 * tests as they don't interact with MongoMemoryServer from vitest.setup.ts.
 */
import { describe, it, expect, beforeEach, vi, afterAll } from "vitest";
import { NextRequest } from "next/server";

// Use vi.hoisted() to make findMock available in vi.mock() factory
const { findMock } = vi.hoisted(() => ({
  findMock: vi.fn(),
}));

vi.mock("mongoose", () => {
  const chain = {
    select: vi.fn(() => chain),
    sort: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    skip: vi.fn(() => chain),
    lean: vi.fn(() => []),
  };
  findMock.mockReturnValue(chain);
  
  const mockObjectId = Object.assign(
    vi.fn((id?: string) => ({
      toString: () => id ?? "mock-id",
    })),
    { isValid: vi.fn((value?: string) => typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value)) },
  );
  return {
    Schema: class Dummy {},
    model: () => ({ find: findMock, countDocuments: vi.fn().mockResolvedValue(0) }),
    models: {},
    connection: { readyState: 1 },
    Types: { ObjectId: mockObjectId },
  };
});

vi.mock("@/lib/mongo", () => ({
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

import { GET } from "@/app/api/admin/users/route";

describe("GET /api/admin/users filters", () => {
  beforeEach(() => {
    findMock.mockClear();
  });
  
  // Restore all mocks after tests to prevent contamination of other test files
  afterAll(() => {
    vi.doUnmock("mongoose");
    vi.resetModules();
  });

  it("passes UI filters to query", async () => {
    const url =
      "http://localhost/api/admin/users?role=ORG_ADMIN&status=LOCKED&department=Engineering&inactiveDays=30&lastLoginFrom=2024-01-01&lastLoginTo=2024-01-31&search=alice";
    const req = new NextRequest(url);
    await GET(req);

    expect(findMock).toHaveBeenCalledTimes(1);
    const query = findMock.mock.calls[0][0] as Record<string, unknown>;
    expect(query.orgId).toBe("org1");
    expect(query["professional.role"]).toBe("ORG_ADMIN");
    expect(query.status).toBe("LOCKED");
    expect(query["professional.department"]).toBe("Engineering");
    expect(query.lastLoginAt).toMatchObject({
      $lte: expect.any(Date),
      $gte: expect.any(Date),
    });
    expect(query.$or).toBeDefined(); // search applied
  });
});

// Restore mongoose mock after ALL tests in file to prevent contamination
// NOTE: Must be at module level, not inside describe block
afterAll(() => {
  vi.doUnmock("mongoose");
  vi.resetModules();
});

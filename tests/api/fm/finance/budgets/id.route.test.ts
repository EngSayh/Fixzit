import { describe, it, expect, beforeEach, vi } from "vitest";
import { ObjectId } from "mongodb";
import type { NextRequest } from "next/server";
import { PATCH, DELETE } from "@/app/api/fm/finance/budgets/[id]/route";

const mockFindOneAndUpdate = vi.fn();
const mockFindOneAndDelete = vi.fn();
const mockRequireFmPermission = vi.fn();
const mockResolveTenantId = vi.fn();
const mockBuildTenantFilter = vi.fn();
const mockIsCrossTenantMode = vi.fn();

vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn().mockResolvedValue({
    collection: () => ({
      findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args),
      findOneAndDelete: (...args: unknown[]) => mockFindOneAndDelete(...args),
    }),
  }),
}));

vi.mock("@/app/api/fm/permissions", () => ({
  requireFmPermission: (...args: unknown[]) => mockRequireFmPermission(...args),
}));

vi.mock("@/app/api/fm/utils/tenant", () => ({
  resolveTenantId: (...args: unknown[]) => mockResolveTenantId(...args),
  buildTenantFilter: (...args: unknown[]) => mockBuildTenantFilter(...args),
  isCrossTenantMode: (...args: unknown[]) => mockIsCrossTenantMode(...args),
}));

vi.mock("@/lib/mongoUtils.server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/mongoUtils.server")>();
  return {
    ...actual,
    unwrapFindOneResult: actual.unwrapFindOneResult,
  };
});

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

const tenantFilter = { orgId: "tenant-123" };

const makeReq = (body?: unknown) => {
  const req = {
    headers: new Headers(),
    nextUrl: new URL("http://localhost/api/fm/finance/budgets/65d2d2d2d2d2d2d2d2d2d2d2"),
    json: body !== undefined ? async () => body : undefined,
  };
  return req as unknown as NextRequest;
};

describe("FM Budgets by id API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireFmPermission.mockResolvedValue({
      orgId: "tenant-123",
      tenantId: "tenant-123",
      isSuperAdmin: false,
      userId: "user-1",
    });
    mockResolveTenantId.mockReturnValue({
      tenantId: "tenant-123",
      source: "session",
    });
    mockBuildTenantFilter.mockReturnValue(tenantFilter);
    mockIsCrossTenantMode.mockReturnValue(false);
  });

  it("PATCH includes tenant filter in query and returns updated budget", async () => {
    const updatedDoc = {
      _id: new ObjectId("65d2d2d2d2d2d2d2d2d2d2d2"),
      orgId: "tenant-123",
      name: "Ops Budget",
      department: "Ops",
      allocated: 5000,
      currency: "USD",
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-02T00:00:00Z"),
    };

    mockFindOneAndUpdate.mockResolvedValue({ value: updatedDoc });

    const res = await PATCH(
      makeReq({ name: "Ops Budget" }),
      { params: { id: "65d2d2d2d2d2d2d2d2d2d2d2" } }
    );

    expect(mockBuildTenantFilter).toHaveBeenCalledWith("tenant-123");
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "tenant-123",
        _id: expect.any(ObjectId),
      }),
      expect.objectContaining({
        $set: expect.objectContaining({ name: "Ops Budget" }),
      }),
      expect.objectContaining({ returnDocument: "after" })
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      success: true,
      data: {
        id: updatedDoc._id.toString(),
        name: "Ops Budget",
        department: "Ops",
        allocated: 5000,
        currency: "USD",
      },
    });
  });

  it("DELETE includes tenant filter in query and returns success", async () => {
    const deletedDoc = {
      _id: new ObjectId("65d2d2d2d2d2d2d2d2d2d2d2"),
      orgId: "tenant-123",
      name: "Ops Budget",
      department: "Ops",
      allocated: 5000,
      currency: "USD",
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-02T00:00:00Z"),
    };
    mockFindOneAndDelete.mockResolvedValue({ value: deletedDoc });

    const res = await DELETE(
      makeReq(),
      { params: { id: "65d2d2d2d2d2d2d2d2d2d2d2" } }
    );

    expect(mockBuildTenantFilter).toHaveBeenCalledWith("tenant-123");
    expect(mockFindOneAndDelete).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "tenant-123",
        _id: expect.any(ObjectId),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      success: true,
      message: "Budget deleted successfully",
    });
  });
});

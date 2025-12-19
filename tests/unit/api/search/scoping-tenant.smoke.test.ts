import { describe, expect, it } from "vitest";
import { applyEntityScope } from "@/app/api/search/_lib/scoping";
import { UserRole } from "@/types/user";
import type { SessionUser } from "@/types/session-user";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


const baseQuery = { org_id: "org-1" };

const session = (overrides: Partial<SessionUser> = {}): SessionUser =>
  ({
    id: "u1",
    orgId: "org-1",
    role: UserRole.TENANT,
    isSuperAdmin: false,
    vendorId: undefined,
    assignedProperties: [],
    units: [],
    ...overrides,
  }) as SessionUser;

describe("search scoping tenant enforcement", () => {
  it("denies workOrders when tenant has no assigned properties or id", () => {
    const result = applyEntityScope("workOrders", session({ id: undefined as unknown as string }), { ...baseQuery });
    expect(result.allowed).toBe(false);
  });

  it("scopes workOrders to tenant requester id when valid ObjectId", () => {
    const result = applyEntityScope("workOrders", session({ id: "65f0e7c0c0c0c0c0c0c0c0c0" }), { ...baseQuery });
    expect(result.allowed).toBe(true);
    expect(result.query).toMatchObject({
      "requester.userId": expect.anything(),
    });
  });

  it("scopes vendors and orders to vendorId when vendor role present", () => {
    const vendorSession = session({
      role: UserRole.VENDOR,
      vendorId: "65f0e7c0c0c0c0c0c0c0c0c0",
    });
    const vendorsResult = applyEntityScope("vendors", vendorSession, { ...baseQuery });
    const ordersResult = applyEntityScope("orders", vendorSession, { ...baseQuery });

    expect(vendorsResult.allowed).toBe(true);
    expect(ordersResult.allowed).toBe(true);
    expect(vendorsResult.query).toMatchObject({
      _id: expect.anything(),
      org_id: "org-1",
    });
    expect(ordersResult.query).toMatchObject({
      vendorId: expect.anything(),
    });
  });
});

import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";

import { applyEntityScope } from "@/app/api/search/route";
import { UserRole } from "@/types/user";
import type { SessionUser } from "@/server/middleware/withAuthRbac";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


const baseQuery = { orgId: new ObjectId("656f1f1f1f1f1f1f1f1f1f1f") };

const session = (overrides: Partial<SessionUser>): SessionUser => ({
  id: "u1",
  orgId: "org",
  role: overrides.role ?? UserRole.TENANT,
  roles: overrides.roles ?? [],
  tenantId: overrides.tenantId ?? "",
  vendorId: overrides.vendorId ?? "",
  assignedProperties: overrides.assignedProperties,
  units: overrides.units,
  ...overrides,
});

describe("applyEntityScope – per-role filters", () => {
  it("scopes tenant work orders to requester.userId", () => {
    const userId = new ObjectId().toHexString();
    const scoped = applyEntityScope("workOrders", session({ id: userId, role: UserRole.TENANT }), baseQuery);
    expect(scoped.allowed).toBe(true);
    expect(scoped.query["requester.userId"]).toEqual(new ObjectId(userId));
  });

  it("scopes technician work orders to assignment.assignedTo.userId", () => {
    const techId = new ObjectId().toHexString();
    const scoped = applyEntityScope("workOrders", session({ id: techId, role: UserRole.TECHNICIAN }), baseQuery);
    expect(scoped.allowed).toBe(true);
    expect(scoped.query["assignment.assignedTo.userId"]).toEqual(new ObjectId(techId));
  });

  it("scopes vendor RFQs to invitedVendors.vendorId", () => {
    const vendorId = new ObjectId().toHexString();
    const scoped = applyEntityScope("rfqs", session({ role: UserRole.VENDOR, vendorId }), baseQuery);
    expect(scoped.allowed).toBe(true);
    expect(scoped.query["invitedVendors.vendorId"]).toEqual(new ObjectId(vendorId));
  });

  it("blocks vendor without vendorId and scopes vendor orders when vendorId present", () => {
    const withoutVendorId = applyEntityScope("orders", session({ role: UserRole.VENDOR, vendorId: undefined }), baseQuery);
    expect(withoutVendorId.allowed).toBe(false);

    const vendorId = new ObjectId().toHexString();
    const withVendorId = applyEntityScope("orders", session({ role: UserRole.VENDOR, vendorId }), baseQuery);
    expect(withVendorId.allowed).toBe(true);
    expect(withVendorId.query["vendorId"]).toEqual(new ObjectId(vendorId));
  });

  it("scopes owner listings/projects to assigned properties and blocks when none", () => {
    const props = [new ObjectId().toHexString()];
    const ownerSession = session({ role: UserRole.OWNER, assignedProperties: props });

    const scopedListings = applyEntityScope("listings", ownerSession, baseQuery);
    expect(scopedListings.allowed).toBe(true);
    expect(scopedListings.query["propertyId"]).toEqual({ $in: props.map((p) => new ObjectId(p)) });

    const scopedProjects = applyEntityScope("projects", ownerSession, baseQuery);
    expect(scopedProjects.allowed).toBe(true);
    expect(scopedProjects.query["propertyId"]).toEqual({ $in: props.map((p) => new ObjectId(p)) });

    const blocked = applyEntityScope("listings", session({ role: UserRole.OWNER, assignedProperties: [] }), baseQuery);
    expect(blocked.allowed).toBe(false);
  });

  it("agents remain org-scoped (no property-based restriction)", () => {
    const scoped = applyEntityScope("agents", session({ role: UserRole.OWNER, assignedProperties: ["p1"] }), baseQuery);
    expect(scoped.allowed).toBe(true);
    expect(scoped.query).toEqual(baseQuery);
  });
});

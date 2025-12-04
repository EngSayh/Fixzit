import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import {
  applyEntityScope,
  canSearchEntity,
} from "@/app/api/search/route";
import {
  WORK_ORDERS_ENTITY,
  WORK_ORDERS_ENTITY_LEGACY,
} from "@/config/topbar-modules";
import { UserRole } from "@/types/user";
import type { SessionUser } from "@/server/middleware/withAuthRbac";

const orgObjectId = new ObjectId();

const baseQuery = () =>
  ({
    orgId: orgObjectId,
    $text: { $search: "foo" },
    deletedAt: { $exists: false },
    isDeleted: { $ne: true },
  }) as Record<string, unknown>;

const makeSession = (overrides: Partial<SessionUser> = {}): SessionUser => ({
  id: new ObjectId().toHexString(),
  orgId: orgObjectId.toHexString(),
  tenantId: orgObjectId.toHexString(),
  role: UserRole.MANAGER,
  permissions: [],
  roles: [],
  isSuperAdmin: false,
  ...overrides,
});

describe("search RBAC and tenancy scoping", () => {
  describe("canSearchEntity", () => {
    it("allows canonical and legacy work orders for allowed roles", () => {
      const session = makeSession({ role: UserRole.MANAGER });
      expect(canSearchEntity(session, WORK_ORDERS_ENTITY)).toBe(true);
      expect(canSearchEntity(session, WORK_ORDERS_ENTITY_LEGACY)).toBe(true);
    });

    it("denies work orders for roles not in permission map", () => {
      const session = makeSession({ role: UserRole.FINANCE });
      expect(canSearchEntity(session, WORK_ORDERS_ENTITY)).toBe(false);
    });

    it("permits access when explicit permission is present even if role is not", () => {
      const session = makeSession({
        role: UserRole.FINANCE,
        permissions: ["wo.read"],
      });
      expect(canSearchEntity(session, WORK_ORDERS_ENTITY)).toBe(true);
    });

    it("respects subRole-based access for tenants.read via SUPPORT_AGENT sub-role", () => {
      const session = makeSession({
        role: UserRole.TEAM_MEMBER,
        subRole: "SUPPORT_AGENT",
        roles: [UserRole.SUPPORT_AGENT],
      });
      expect(canSearchEntity(session, "tenants")).toBe(true);
    });
  });

  describe("applyEntityScope", () => {
    it("returns base query unchanged for super users", () => {
      const session = makeSession({ isSuperAdmin: true });
      const scoped = applyEntityScope(WORK_ORDERS_ENTITY, session, baseQuery());
      expect(scoped.allowed).toBe(true);
      expect(scoped.query).toEqual(baseQuery());
    });

    it("scopes tenants to their own work orders", () => {
      const tenantId = new ObjectId().toHexString();
      const session = makeSession({ role: UserRole.TENANT, id: tenantId });
      const scoped = applyEntityScope(WORK_ORDERS_ENTITY, session, baseQuery());
      expect(scoped.allowed).toBe(true);
      expect(scoped.query["requester.userId"]?.toString()).toBe(tenantId);
    });

    it("requires owner assignments for work orders", () => {
      const session = makeSession({
        role: UserRole.OWNER,
        assignedProperties: [],
        roles: [UserRole.OWNER],
      });
      const scoped = applyEntityScope(WORK_ORDERS_ENTITY, session, baseQuery());
      expect(scoped.allowed).toBe(false);
    });

    it("requires owner assignments for properties and applies $in when present", () => {
      const propertyIds = [new ObjectId().toHexString()];
      const session = makeSession({
        role: UserRole.OWNER,
        assignedProperties: propertyIds,
      });
      const scoped = applyEntityScope("properties", session, baseQuery());
      expect(scoped.allowed).toBe(true);
      expect(scoped.query["_id"]).toEqual({ $in: propertyIds.map((id) => new ObjectId(id)) });
    });

    it("requires tenant unit list for properties and units", () => {
      const tenantWithNoUnits = makeSession({
        role: UserRole.TENANT,
        units: [],
        roles: [UserRole.TENANT],
      });
      expect(applyEntityScope("properties", tenantWithNoUnits, baseQuery()).allowed).toBe(false);
      expect(applyEntityScope("units", tenantWithNoUnits, baseQuery()).allowed).toBe(false);

      const unitIds = [new ObjectId().toHexString()];
      const tenantWithUnits = makeSession({
        role: UserRole.TENANT,
        units: unitIds,
        roles: [UserRole.TENANT],
      });
      const unitsScope = applyEntityScope("units", tenantWithUnits, baseQuery());
      expect(unitsScope.allowed).toBe(true);
      expect(unitsScope.query["_id"]).toEqual({ $in: unitIds.map((id) => new ObjectId(id)) });
    });

    it("requires vendorId for vendor-scoped entities", () => {
      const vendorMissingId = makeSession({ role: UserRole.VENDOR });
      expect(applyEntityScope("orders", vendorMissingId, baseQuery()).allowed).toBe(false);

      const vendorId = new ObjectId().toHexString();
      const vendorWithId = makeSession({ role: UserRole.VENDOR, vendorId });
      const scoped = applyEntityScope("orders", vendorWithId, baseQuery());
      expect(scoped.allowed).toBe(true);
      expect(scoped.query["vendorId"]?.toString()).toBe(vendorId);
    });

    it("scopes technician work orders to assignments", () => {
      const technicianId = new ObjectId().toHexString();
      const session = makeSession({ role: UserRole.TECHNICIAN, id: technicianId });
      const scoped = applyEntityScope(WORK_ORDERS_ENTITY, session, baseQuery());
      expect(scoped.allowed).toBe(true);
      expect(scoped.query["assignment.assignedTo.userId"]?.toString()).toBe(technicianId);
    });
  });
});

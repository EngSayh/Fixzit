import { describe, it, expect } from "vitest";

import {
  canTransition,
  can,
  Role,
  Plan,
  WOStatus,
  SubmoduleKey,
  type ResourceCtx,
} from "@/domain/fm/fm.behavior";

describe("FM Work Order FSM transition validation", () => {
  const baseCtx: ResourceCtx = {
    orgId: "org-1",
    plan: Plan.PRO,
    role: Role.TECHNICIAN,
    userId: "tech-1",
    isOrgMember: true,
    uploadedMedia: [],
    isTechnicianAssigned: true,
  };

  it("requires BEFORE media for assessment -> estimate", () => {
    const invalid = canTransition(
      WOStatus.ASSESSMENT,
      WOStatus.ESTIMATE_PENDING,
      Role.TECHNICIAN,
      baseCtx,
    );
    expect(invalid).toBe(false);

    const ctxWithMedia: ResourceCtx = {
      ...baseCtx,
      uploadedMedia: ["BEFORE"],
    };
    const valid = canTransition(
      WOStatus.ASSESSMENT,
      WOStatus.ESTIMATE_PENDING,
      Role.TECHNICIAN,
      ctxWithMedia,
    );
    expect(valid).toBe(true);
  });

  it("requires technician assignment before starting work", () => {
    const ctxWithoutAssignment: ResourceCtx = {
      ...baseCtx,
      uploadedMedia: ["BEFORE"],
      isTechnicianAssigned: false,
    };
    const blocked = canTransition(
      WOStatus.APPROVED,
      WOStatus.IN_PROGRESS,
      Role.TECHNICIAN,
      ctxWithoutAssignment,
    );
    expect(blocked).toBe(false);

    const ctxWithAssignment: ResourceCtx = {
      ...ctxWithoutAssignment,
      isTechnicianAssigned: true,
    };
    const allowed = canTransition(
      WOStatus.APPROVED,
      WOStatus.IN_PROGRESS,
      Role.TECHNICIAN,
      ctxWithAssignment,
    );
    expect(allowed).toBe(true);
  });

  it("blocks property owners from acting on properties they do not own", () => {
    const ownerCtx: ResourceCtx = {
      orgId: "org-1",
      plan: Plan.STANDARD,
      role: Role.PROPERTY_OWNER,
      userId: "owner-1",
      isOrgMember: true,
      propertyId: "prop-1",
      isOwnerOfProperty: false,
    };

    const allowed = can(SubmoduleKey.WO_TRACK_ASSIGN, "approve", {
      ...ownerCtx,
    });
    expect(allowed).toBe(false);

    const nowOwner = can(SubmoduleKey.WO_TRACK_ASSIGN, "approve", {
      ...ownerCtx,
      isOwnerOfProperty: true,
    });
    expect(nowOwner).toBe(true);
  });
});

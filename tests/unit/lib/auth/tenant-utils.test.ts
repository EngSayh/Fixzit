/**
 * @fileoverview Tests for Tenant Validation Utilities
 * @description Unit tests for lib/auth/tenant-utils.ts
 */

import { describe, it, expect } from "vitest";
import {
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});

  TenantError,
  requireOrgId,
  requireOrgIdFromUser,
  isValidOrgId,
  getOrgIdOrNull,
  isValidOrgIdObjectId,
  isOrgIdAllowed,
} from "@/lib/auth/tenant-utils";

describe("lib/auth/tenant-utils", () => {
  describe("requireOrgId", () => {
    it("returns valid orgId from session", () => {
      const session = { user: { orgId: "org-123", id: "user-1" } } as any;
      expect(requireOrgId(session)).toBe("org-123");
    });

    it("trims whitespace from orgId", () => {
      const session = { user: { orgId: "  org-456  ", id: "user-1" } } as any;
      expect(requireOrgId(session)).toBe("org-456");
    });

    it("throws TenantError for null session", () => {
      expect(() => requireOrgId(null)).toThrow(TenantError);
      expect(() => requireOrgId(null)).toThrow("Missing orgId in session");
    });

    it("throws TenantError for undefined session", () => {
      expect(() => requireOrgId(undefined)).toThrow(TenantError);
    });

    it("throws TenantError for session without user", () => {
      expect(() => requireOrgId({} as any)).toThrow(TenantError);
    });

    it("throws TenantError for session with null orgId", () => {
      const session = { user: { orgId: null, id: "user-1" } } as any;
      expect(() => requireOrgId(session)).toThrow(TenantError);
    });

    it("throws TenantError for empty string orgId", () => {
      const session = { user: { orgId: "", id: "user-1" } } as any;
      // Empty string is falsy, so it throws "Missing orgId"
      expect(() => requireOrgId(session)).toThrow("Missing orgId in session");
    });

    it("throws TenantError for whitespace-only orgId", () => {
      const session = { user: { orgId: "   ", id: "user-1" } } as any;
      expect(() => requireOrgId(session)).toThrow("Empty or invalid orgId");
    });

    it("throws TenantError for 'null' string orgId", () => {
      const session = { user: { orgId: "null", id: "user-1" } } as any;
      expect(() => requireOrgId(session)).toThrow("Empty or invalid orgId");
    });

    it("throws TenantError for 'undefined' string orgId", () => {
      const session = { user: { orgId: "undefined", id: "user-1" } } as any;
      expect(() => requireOrgId(session)).toThrow("Empty or invalid orgId");
    });

    it("includes context in error message when provided", () => {
      expect(() => requireOrgId(null, "my-route")).toThrow("(my-route)");
    });

    it("throws TenantError for non-string orgId", () => {
      const session = { user: { orgId: 12345, id: "user-1" } } as any;
      expect(() => requireOrgId(session)).toThrow("Invalid orgId type");
    });
  });

  describe("requireOrgIdFromUser", () => {
    it("returns valid orgId from user object", () => {
      const user = { orgId: "org-789", id: "user-1" };
      expect(requireOrgIdFromUser(user)).toBe("org-789");
    });

    it("throws TenantError for null user", () => {
      expect(() => requireOrgIdFromUser(null)).toThrow(TenantError);
    });

    it("throws TenantError for user without orgId", () => {
      const user = { id: "user-1" } as any;
      expect(() => requireOrgIdFromUser(user)).toThrow(TenantError);
    });
  });

  describe("isValidOrgId", () => {
    it("returns true for valid orgId string", () => {
      expect(isValidOrgId("org-123")).toBe(true);
      expect(isValidOrgId("507f1f77bcf86cd799439011")).toBe(true);
    });

    it("returns false for null", () => {
      expect(isValidOrgId(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isValidOrgId(undefined)).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isValidOrgId("")).toBe(false);
    });

    it("returns false for whitespace", () => {
      expect(isValidOrgId("   ")).toBe(false);
    });

    it("returns false for 'null' string", () => {
      expect(isValidOrgId("null")).toBe(false);
    });

    it("returns false for 'undefined' string", () => {
      expect(isValidOrgId("undefined")).toBe(false);
    });

    it("returns false for 'unknown' string", () => {
      expect(isValidOrgId("unknown")).toBe(false);
    });

    it("returns false for 'anonymous' string", () => {
      expect(isValidOrgId("anonymous")).toBe(false);
    });

    it("returns false for non-string values", () => {
      expect(isValidOrgId(123)).toBe(false);
      expect(isValidOrgId({})).toBe(false);
      expect(isValidOrgId([])).toBe(false);
    });
  });

  describe("getOrgIdOrNull", () => {
    it("returns orgId for valid session", () => {
      const session = { user: { orgId: "org-123", id: "user-1" } } as any;
      expect(getOrgIdOrNull(session)).toBe("org-123");
    });

    it("returns null for null session", () => {
      expect(getOrgIdOrNull(null)).toBeNull();
    });

    it("returns null for session without orgId", () => {
      const session = { user: { id: "user-1" } } as any;
      expect(getOrgIdOrNull(session)).toBeNull();
    });

    it("returns null for invalid orgId values", () => {
      expect(getOrgIdOrNull({ user: { orgId: "" } } as any)).toBeNull();
      expect(getOrgIdOrNull({ user: { orgId: "unknown" } } as any)).toBeNull();
    });
  });

  describe("isValidOrgIdObjectId", () => {
    it("returns true for valid MongoDB ObjectId", () => {
      expect(isValidOrgIdObjectId("507f1f77bcf86cd799439011")).toBe(true);
      expect(isValidOrgIdObjectId("66f2a0b1e1c2a3b4c5d6e7f8")).toBe(true);
    });

    it("returns false for invalid ObjectId format", () => {
      expect(isValidOrgIdObjectId("org-123")).toBe(false);
      expect(isValidOrgIdObjectId("too-short")).toBe(false);
      expect(isValidOrgIdObjectId("507f1f77bcf86cd79943901X")).toBe(false);
    });

    it("returns false for invalid values", () => {
      expect(isValidOrgIdObjectId(null)).toBe(false);
      expect(isValidOrgIdObjectId("")).toBe(false);
    });
  });

  describe("isOrgIdAllowed", () => {
    const allowedSet = new Set(["org-1", "org-2", "org-3"]);
    const allowedArray = ["org-1", "org-2", "org-3"];

    it("returns true for orgId in allowed Set", () => {
      expect(isOrgIdAllowed("org-1", allowedSet)).toBe(true);
      expect(isOrgIdAllowed("org-2", allowedSet)).toBe(true);
    });

    it("returns true for orgId in allowed array", () => {
      expect(isOrgIdAllowed("org-1", allowedArray)).toBe(true);
    });

    it("returns false for orgId not in allowed set", () => {
      expect(isOrgIdAllowed("org-999", allowedSet)).toBe(false);
    });

    it("returns false for invalid orgId", () => {
      expect(isOrgIdAllowed(null, allowedSet)).toBe(false);
      expect(isOrgIdAllowed("", allowedSet)).toBe(false);
      expect(isOrgIdAllowed("unknown", allowedSet)).toBe(false);
    });
  });
});

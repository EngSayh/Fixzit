import { describe, expect, it } from "vitest";
import { __internals } from "@/server/middleware/withAuthRbac";
import { Role } from "@/domain/fm/fm.behavior";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


const { normalizeWorkOrderRole } = __internals;

describe("withAuthRbac normalizeWorkOrderRole", () => {
  it("maps canonical admin roles", () => {
    expect(normalizeWorkOrderRole("ADMIN")).toBe(Role.ADMIN);
    expect(normalizeWorkOrderRole("SUPER_ADMIN")).toBe(Role.SUPER_ADMIN);
  });

  it("maps legacy aliases to canonical roles", () => {
    expect(normalizeWorkOrderRole("CORPORATE_ADMIN")).toBe(Role.ADMIN);
    expect(normalizeWorkOrderRole("FM_MANAGER")).toBe(Role.PROPERTY_MANAGER);
    expect(normalizeWorkOrderRole("FINANCE")).toBe(Role.TEAM_MEMBER);
  });

  it("handles tenant/vendor/technician roles", () => {
    expect(normalizeWorkOrderRole("TENANT")).toBe(Role.TENANT);
    expect(normalizeWorkOrderRole("VENDOR")).toBe(Role.VENDOR);
    expect(normalizeWorkOrderRole("TECHNICIAN")).toBe(Role.TECHNICIAN);
  });

  it("returns null for unknown roles", () => {
    expect(normalizeWorkOrderRole("UNKNOWN_ROLE")).toBeNull();
    expect(normalizeWorkOrderRole(undefined)).toBeNull();
  });
});

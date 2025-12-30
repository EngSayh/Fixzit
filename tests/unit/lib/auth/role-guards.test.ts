/**
 * @fileoverview Tests for role guard legacy HR aliases
 */

import { describe, it, expect } from "vitest";
import { hasAllowedRole } from "@/lib/auth/role-guards";

describe("hasAllowedRole legacy HR aliases", () => {
  it("allows HR_ADMIN when HR is allowed", () => {
    expect(hasAllowedRole("HR_ADMIN", null, ["HR"]))
      .toBe(true);
  });

  it("allows HR_MANAGER when HR_OFFICER is allowed", () => {
    expect(hasAllowedRole("HR_MANAGER", null, ["HR_OFFICER"]))
      .toBe(true);
  });

  it("does not allow HR_ADMIN for unrelated roles", () => {
    expect(hasAllowedRole("HR_ADMIN", null, ["FINANCE"]))
      .toBe(false);
  });

  it("allows HR_MANAGER as subRole when HR is allowed", () => {
    expect(hasAllowedRole("TEAM_MEMBER", "HR_MANAGER", ["HR"]))
      .toBe(true);
  });
});

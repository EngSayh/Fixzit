import { describe, it, expect } from "vitest";
import { Role, SubRole } from "@/lib/rbac/client-roles";
import { CANONICAL_ROLES } from "@/types/user";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


describe("RBAC client role parity", () => {
  it("includes all canonical roles from types/user.ts", () => {
    const clientRoles = new Set([...Object.values(Role), ...Object.values(SubRole)]);
    for (const role of CANONICAL_ROLES) {
      expect(
        clientRoles.has(role),
        `Role ${role} missing in client-roles.ts; run pnpm rbac:client:generate`,
      ).toBe(true);
    }
  });
});

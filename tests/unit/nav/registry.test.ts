/**
 * 🔒 SECURITY TEST: nav/registry.ts GUEST role authorization
 *
 * Verifies that GUEST role does NOT have access to dashboard or other privileged modules
 * Only SUPPORT access should be granted to GUEST role
 */

import { describe, it, expect } from "vitest";
import { modules } from "@/nav/registry";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


describe("🔒 SECURITY: nav/registry.ts - GUEST Role Authorization", () => {
  it("should NOT grant GUEST access to dashboard", () => {
    const dashboardModule = modules.find((m) => m.id === "dashboard");
    expect(dashboardModule).toBeDefined();
    expect(dashboardModule!.roles).not.toContain("GUEST");
  });

  it("should NOT grant GUEST access to work-orders", () => {
    const workOrdersModule = modules.find((m) => m.id === "work-orders");
    expect(workOrdersModule).toBeDefined();
    expect(workOrdersModule!.roles).not.toContain("GUEST");
  });

  it("should NOT grant GUEST access to properties", () => {
    const propertiesModule = modules.find((m) => m.id === "properties");
    expect(propertiesModule).toBeDefined();
    expect(propertiesModule!.roles).not.toContain("GUEST");
  });

  it("should NOT grant GUEST access to finance", () => {
    const financeModule = modules.find((m) => m.id === "finance");
    expect(financeModule).toBeDefined();
    expect(financeModule!.roles).not.toContain("GUEST");
  });

  it("should NOT grant GUEST access to hr", () => {
    const hrModule = modules.find((m) => m.id === "hr");
    expect(hrModule).toBeDefined();
    expect(hrModule!.roles).not.toContain("GUEST");
  });

  it("should NOT grant GUEST access to administration", () => {
    const administrationModule = modules.find((m) => m.id === "administration");
    expect(administrationModule).toBeDefined();
    expect(administrationModule!.roles).not.toContain("GUEST");
  });

  it("should ONLY grant GUEST access to support-related modules", () => {
    const guestModules = modules.filter((m) => m.roles.includes("GUEST"));

    // GUEST should have very limited access
    expect(guestModules.length).toBeLessThanOrEqual(2); // support and maybe one more public module

    // If GUEST has any access, it should be to support-related modules only
    guestModules.forEach((module) => {
      const isSupport =
        module.id.includes("support") || module.id.includes("help");
      const isPublic =
        module.id.includes("marketplace") || module.id.includes("public");
      expect(isSupport || isPublic).toBe(true);
    });
  });

  it("should grant proper access to TENANT role", () => {
    const dashboardModule = modules.find((m) => m.id === "dashboard");
    expect(dashboardModule!.roles).toContain("TENANT");
  });

  it("should grant proper access to VENDOR role", () => {
    const dashboardModule = modules.find((m) => m.id === "dashboard");
    expect(dashboardModule!.roles).toContain("VENDOR");
  });

  it("should grant proper access to TECHNICIAN role", () => {
    const dashboardModule = modules.find((m) => m.id === "dashboard");
    expect(dashboardModule!.roles).toContain("TECHNICIAN");
  });

  it("should maintain principle of least privilege", () => {
    // Dashboard should not be accessible to guests (principle of least privilege)
    const dashboardModule = modules.find((m) => m.id === "dashboard");
    const hasGuestAccess = dashboardModule?.roles.includes("GUEST");

    expect(hasGuestAccess).toBe(false);
  });
});

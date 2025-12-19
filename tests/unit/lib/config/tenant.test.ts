/**
 * Tests for tenant configuration utility
 * @module tests/unit/lib/config/tenant.test
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

import {
  getTenantConfig,
  getCurrency,
  getSupportContact,
  getTimezone,
  isFeatureEnabled,
  clearTenantCache,
  updateTenantConfig,
} from "@/lib/config/tenant";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});

// Mock the constants module
vi.mock("@/lib/config/constants", () => ({
  Config: {
    company: {
      name: "Fixzit",
      supportEmail: "support@fixzit.co",
      supportPhone: "+966500000000",
    },
  },
}));

describe("Tenant Configuration", () => {
  beforeEach(() => {
    clearTenantCache();
    vi.unstubAllEnvs();
  });

  describe("getTenantConfig", () => {
    it("should return default config when no orgId provided", () => {
      const config = getTenantConfig();
      expect(config).toBeDefined();
      expect(config.orgId).toBe("default");
    });

    it("should return default config for 'default' orgId", () => {
      const config = getTenantConfig("default");
      expect(config.orgId).toBe("default");
    });

    it("should return config with provided orgId", () => {
      const config = getTenantConfig("org_123");
      expect(config.orgId).toBe("org_123");
    });

    it("should return consistent configurations for same orgId", () => {
      const config1 = getTenantConfig("org_123");
      const config2 = getTenantConfig("org_123");
      // Config values should be equal (same shape and values)
      expect(config1).toStrictEqual(config2);
    });

    it("should include all required fields", () => {
      const config = getTenantConfig();
      expect(config).toHaveProperty("name");
      expect(config).toHaveProperty("domain");
      expect(config).toHaveProperty("supportEmail");
      expect(config).toHaveProperty("supportPhone");
      expect(config).toHaveProperty("currency");
      expect(config).toHaveProperty("timezone");
      expect(config).toHaveProperty("branding");
      expect(config).toHaveProperty("features");
    });

    it("should have branding configuration", () => {
      const config = getTenantConfig();
      expect(config.branding).toHaveProperty("primaryColor");
      expect(config.branding).toHaveProperty("secondaryColor");
    });

    it("should have feature flags", () => {
      const config = getTenantConfig();
      expect(config.features).toHaveProperty("multiLanguage");
      expect(config.features).toHaveProperty("smsNotifications");
      expect(config.features).toHaveProperty("emailNotifications");
      expect(config.features).toHaveProperty("mfaRequired");
    });
  });

  describe("getCurrency", () => {
    it("should return default currency SAR", () => {
      const currency = getCurrency();
      expect(currency).toBe("SAR");
    });

    it("should return currency for specific org", () => {
      const currency = getCurrency("org_123");
      expect(currency).toBe("SAR");
    });
  });

  describe("getSupportContact", () => {
    it("should return support email and phone", () => {
      const contact = getSupportContact();
      expect(contact).toHaveProperty("email");
      expect(contact).toHaveProperty("phone");
    });

    it("should return string values", () => {
      const contact = getSupportContact();
      expect(typeof contact.email).toBe("string");
      expect(typeof contact.phone).toBe("string");
    });
  });

  describe("getTimezone", () => {
    it("should return default timezone Asia/Riyadh", () => {
      const timezone = getTimezone();
      expect(timezone).toBe("Asia/Riyadh");
    });

    it("should return timezone for specific org", () => {
      const timezone = getTimezone("org_123");
      expect(timezone).toBe("Asia/Riyadh");
    });
  });

  describe("isFeatureEnabled", () => {
    it("should return boolean for multiLanguage", () => {
      const enabled = isFeatureEnabled("multiLanguage");
      expect(typeof enabled).toBe("boolean");
    });

    it("should return boolean for smsNotifications", () => {
      const enabled = isFeatureEnabled("smsNotifications");
      expect(typeof enabled).toBe("boolean");
    });

    it("should return boolean for emailNotifications", () => {
      const enabled = isFeatureEnabled("emailNotifications");
      expect(typeof enabled).toBe("boolean");
    });

    it("should return false for mfaRequired by default", () => {
      const enabled = isFeatureEnabled("mfaRequired");
      expect(enabled).toBe(false);
    });
  });

  describe("clearTenantCache", () => {
    it("should clear cached configurations", () => {
      const config1 = getTenantConfig("org_123");
      clearTenantCache();
      const config2 = getTenantConfig("org_123");
      // Different object references after cache clear
      expect(config1).not.toBe(config2);
    });
  });

  describe("updateTenantConfig", () => {
    it("should update tenant configuration", () => {
      const updated = updateTenantConfig("org_123", {
        currency: "AED",
      });
      expect(updated.currency).toBe("AED");
    });

    it("should preserve existing config fields", () => {
      const updated = updateTenantConfig("org_123", {
        currency: "AED",
      });
      expect(updated.name).toBeDefined();
      expect(updated.timezone).toBeDefined();
    });

    it("should merge branding updates", () => {
      const updated = updateTenantConfig("org_123", {
        branding: { primaryColor: "#FF0000" },
      });
      expect(updated.branding.primaryColor).toBe("#FF0000");
      expect(updated.branding.secondaryColor).toBeDefined();
    });

    it("should merge feature updates", () => {
      const updated = updateTenantConfig("org_123", {
        features: { mfaRequired: true },
      });
      expect(updated.features.mfaRequired).toBe(true);
      expect(updated.features.multiLanguage).toBeDefined();
    });

    it("should persist updates in cache", () => {
      updateTenantConfig("org_123", { currency: "USD" });
      const config = getTenantConfig("org_123");
      expect(config.currency).toBe("USD");
    });
  });
});

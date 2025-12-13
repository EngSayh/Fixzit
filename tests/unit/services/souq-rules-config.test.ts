import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

describe("Souq rule config", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it("returns defaults from Config when no override provided", async () => {
    process.env.SOUQ_RETURN_WINDOW_DAYS = "30";
    process.env.SOUQ_LATE_REPORTING_DAYS = "14";
    process.env.SOUQ_FRAUD_THRESHOLD = "70";
    process.env.SOUQ_HIGH_VALUE_THRESHOLD = "500";
    process.env.SOUQ_MULTIPLE_CLAIMS_PERIOD_DAYS = "30";

    const { getSouqRuleConfig, clearSouqRuleOverrides } = await import(
      "@/services/souq/rules-config"
    );
    clearSouqRuleOverrides();

    const config = getSouqRuleConfig();
    expect(config).toEqual({
      returnWindowDays: 30,
      lateReportingDays: 14,
      fraudThreshold: 70,
      highValueThreshold: 500,
      multipleClaimsPeriodDays: 30,
    });
  });

  it("applies tenant override when present", async () => {
    process.env.SOUQ_RETURN_WINDOW_DAYS = "30";
    process.env.SOUQ_LATE_REPORTING_DAYS = "14";
    process.env.SOUQ_FRAUD_THRESHOLD = "70";
    process.env.SOUQ_HIGH_VALUE_THRESHOLD = "500";
    process.env.SOUQ_MULTIPLE_CLAIMS_PERIOD_DAYS = "30";

    const {
      getSouqRuleConfig,
      setSouqRuleOverride,
      clearSouqRuleOverrides,
    } = await import("@/services/souq/rules-config");

    clearSouqRuleOverrides();
    setSouqRuleOverride("org-123", { returnWindowDays: 45, fraudThreshold: 80 });

    const overrideConfig = getSouqRuleConfig("org-123");
    expect(overrideConfig.returnWindowDays).toBe(45);
    expect(overrideConfig.fraudThreshold).toBe(80);
    expect(overrideConfig.lateReportingDays).toBe(14);
  });
});

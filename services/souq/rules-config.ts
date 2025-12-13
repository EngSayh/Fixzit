import { logger } from "@/lib/logger";

export interface SouqRuleConfig {
  returnWindowDays: number;
  lateReportingDays: number;
  fraudThreshold: number;
  highValueThreshold: number;
  multipleClaimsPeriodDays: number;
}

const baseRuleConfig: SouqRuleConfig = {
  returnWindowDays: parseInt(process.env.RETURN_WINDOW_DAYS || "30", 10),
  lateReportingDays: parseInt(process.env.LATE_REPORTING_DAYS || "14", 10),
  fraudThreshold: parseInt(process.env.FRAUD_THRESHOLD || "70", 10),
  highValueThreshold: parseInt(process.env.HIGH_VALUE_THRESHOLD || "500", 10),
  multipleClaimsPeriodDays: parseInt(
    process.env.MULTIPLE_CLAIMS_PERIOD_DAYS || "30",
    10,
  ),
};

const tenantOverrides: Record<string, Partial<SouqRuleConfig>> = {};

export function setSouqRuleOverride(
  orgId: string,
  override: Partial<SouqRuleConfig>,
): void {
  tenantOverrides[orgId] = { ...tenantOverrides[orgId], ...override };
}

export function clearSouqRuleOverrides(): void {
  Object.keys(tenantOverrides).forEach((key) => delete tenantOverrides[key]);
}

export function getSouqRuleConfig(orgId?: string): SouqRuleConfig {
  const override = orgId ? tenantOverrides[orgId] : undefined;
  if (override) {
    logger.info("[souq.rules] Using tenant override", {
      orgId,
      metric: "souq.rules.override.used",
    });
  } else {
    logger.info("[souq.rules] Using base rule config", {
      orgId: orgId || "unknown",
      metric: "souq.rules.base.used",
    });
  }

  return {
    ...baseRuleConfig,
    ...(override || {}),
  };
}

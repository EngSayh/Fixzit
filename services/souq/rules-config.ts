import { Config } from "@/lib/config/constants";

export interface SouqRuleConfig {
  returnWindowDays: number;
  lateReportingDays: number;
  fraudThreshold: number;
  highValueThreshold: number;
  multipleClaimsPeriodDays: number;
}

const baseRuleConfig: SouqRuleConfig = {
  returnWindowDays: Config.souq.rules.returnWindowDays,
  lateReportingDays: Config.souq.rules.lateReportingDays,
  fraudThreshold: Config.souq.rules.fraudThreshold,
  highValueThreshold: Config.souq.rules.highValueThreshold,
  multipleClaimsPeriodDays: Config.souq.rules.multipleClaimsPeriodDays,
};

const tenantOverrides: Record<string, Partial<SouqRuleConfig>> = {};

export function setSouqRuleOverride(
  orgId: string,
  override: Partial<SouqRuleConfig>,
): void {
  tenantOverrides[orgId] = { ...tenantOverrides[orgId], ...override };
}

export function clearSouqRuleOverrides(): void {
  Object.keys(tenantOverrides).forEach((key) => {
    delete tenantOverrides[key];
  });
}

export function getSouqRuleConfig(orgId?: string): SouqRuleConfig {
  if (!orgId) {
    return baseRuleConfig;
  }

  const override = tenantOverrides[orgId];
  if (!override) {
    return baseRuleConfig;
  }

  return {
    ...baseRuleConfig,
    ...override,
  };
}

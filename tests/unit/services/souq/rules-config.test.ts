import { afterEach, describe, expect, it, vi } from "vitest";
import { clearSouqRuleOverrides, getSouqRuleConfig, setSouqRuleOverride } from "@/services/souq/rules-config";
import { logger } from "@/lib/logger";

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
  },
}));

describe("Souq rule config", () => {
  afterEach(() => {
    clearSouqRuleOverrides();
    vi.clearAllMocks();
  });

  it("returns base config when no override exists", () => {
    const cfg = getSouqRuleConfig("org-base");
    expect(cfg.returnWindowDays).toBeGreaterThan(0);
    expect(cfg.fraudThreshold).toBeGreaterThan(0);
    expect(logger.info).toHaveBeenCalledWith("[souq.rules] Using base rule config", {
      orgId: "org-base",
      metric: "souq.rules.base.used",
    });
  });

  it("applies tenant override and emits telemetry", () => {
    setSouqRuleOverride("org-123", { returnWindowDays: 15, fraudThreshold: 42 });
    const cfg = getSouqRuleConfig("org-123");

    expect(cfg.returnWindowDays).toBe(15);
    expect(cfg.fraudThreshold).toBe(42);
    expect(logger.info).toHaveBeenCalledWith("[souq.rules] Using tenant override", {
      orgId: "org-123",
      metric: "souq.rules.override.used",
    });
  });
});

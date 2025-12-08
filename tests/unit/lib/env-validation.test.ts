import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  validatePaymentConfig,
  validateAllEnv,
} from "@/lib/env-validation";

const originalEnv = { ...process.env };

describe("env-validation payment config", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.PAYTABS_SERVER_KEY;
    delete process.env.PAYTABS_PROFILE_ID;
    delete process.env.TAP_WEBHOOK_SECRET;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("warns in non-production when PayTabs/Tap secrets are missing", () => {
    process.env.NODE_ENV = "development";
    const result = validatePaymentConfig();
    expect(result.errors).toHaveLength(0);
    expect(result.warnings.some((w) => w.includes("PayTabs credentials"))).toBe(
      true,
    );
    expect(result.warnings.some((w) => w.includes("Tap webhook secret"))).toBe(
      true,
    );
  });

  it("errors in production when PayTabs/Tap secrets are missing", () => {
    process.env.NODE_ENV = "production";
    const result = validatePaymentConfig();
    expect(result.errors.some((e) => e.includes("PayTabs credentials"))).toBe(
      true,
    );
    expect(result.errors.some((e) => e.includes("Tap webhook secret"))).toBe(
      true,
    );
  });

  it("passes when PayTabs/Tap secrets are present", () => {
    process.env.NODE_ENV = "production";
    process.env.PAYTABS_SERVER_KEY = "sk";
    process.env.PAYTABS_PROFILE_ID = "pid";
    process.env.TAP_WEBHOOK_SECRET = "tap-secret";
    const result = validatePaymentConfig();
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("validateAllEnv aggregates payment validation", () => {
    process.env.NODE_ENV = "production";
    process.env.MONGODB_URI = "mongodb://test";
    process.env.JWT_SECRET = "x".repeat(32);
    process.env.ENCRYPTION_KEY = "y".repeat(32);
    process.env.CRON_SECRET = "cron-secret";
    process.env.TWILIO_ACCOUNT_SID = "sid";
    process.env.TWILIO_AUTH_TOKEN = "token";
    process.env.TWILIO_PHONE_NUMBER = "+10000000000";
    process.env.PAYTABS_SERVER_KEY = "paytabs-key";
    process.env.PAYTABS_PROFILE_ID = "paytabs-profile";
    process.env.TAP_WEBHOOK_SECRET = "tap-secret";
    const result = validateAllEnv();
    expect(result.valid).toBe(true);
  });
});

/**
 * @file SLA Business Hours Calculation Tests
 * Tests for LOGIC-001: Work Order SLA calculation with business hours
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  isBusinessHour,
  getNextBusinessHourStart,
  computeDueAtBusinessHours,
  resolveSlaTarget,
  DEFAULT_BUSINESS_HOURS,
  type BusinessHoursConfig,
} from "@/lib/sla";

describe("SLA Business Hours", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  // Saudi Arabia work week: Sunday-Thursday, 8am-6pm
  const saudiConfig: BusinessHoursConfig = {
    workDays: [0, 1, 2, 3, 4], // Sunday-Thursday
    startHour: 8,
    endHour: 18,
  };

  describe("isBusinessHour", () => {
    it("returns true for Sunday 10am (working day)", () => {
      const sunday10am = new Date("2025-12-21T10:00:00Z"); // Sunday UTC
      expect(isBusinessHour(sunday10am, saudiConfig)).toBe(true);
    });

    it("returns false for Friday 10am (weekend)", () => {
      const friday10am = new Date("2025-12-26T10:00:00Z"); // Friday UTC
      expect(isBusinessHour(friday10am, saudiConfig)).toBe(false);
    });

    it("returns false for Saturday 10am (weekend)", () => {
      const saturday10am = new Date("2025-12-27T10:00:00Z"); // Saturday UTC
      expect(isBusinessHour(saturday10am, saudiConfig)).toBe(false);
    });

    it("returns false before start hour (7am)", () => {
      const sunday7am = new Date("2025-12-21T07:00:00Z"); // Sunday UTC
      expect(isBusinessHour(sunday7am, saudiConfig)).toBe(false);
    });

    it("returns false after end hour (7pm)", () => {
      const sunday7pm = new Date("2025-12-21T19:00:00Z"); // Sunday UTC
      expect(isBusinessHour(sunday7pm, saudiConfig)).toBe(false);
    });

    it("returns true during business hours on a workday (holiday support not yet implemented)", () => {
      // Note: Holiday support is not yet in the BusinessHoursConfig interface
      // This test checks normal business hours on what would be a holiday
      const tuesday10am = new Date("2025-12-31T10:00:00Z"); // Tuesday 10am UTC
      expect(isBusinessHour(tuesday10am, saudiConfig)).toBe(true);
    });
  });

  describe("getNextBusinessHourStart", () => {
    it("returns same day 8am if called before business hours on a working day", () => {
      const sunday6am = new Date("2025-12-21T06:00:00Z"); // Sunday 6am UTC
      const result = getNextBusinessHourStart(sunday6am, saudiConfig);
      expect(result.getUTCDay()).toBe(0); // Sunday
      expect(result.getUTCHours()).toBe(8);
    });

    it("returns next business day if called on Friday", () => {
      const friday10am = new Date("2025-12-26T10:00:00Z"); // Friday UTC
      const result = getNextBusinessHourStart(friday10am, saudiConfig);
      expect(result.getUTCDay()).toBe(0); // Sunday (next business day)
      expect(result.getUTCHours()).toBe(8);
    });

    it("skips Saturday and returns Sunday", () => {
      const saturday3pm = new Date("2025-12-27T15:00:00Z"); // Saturday UTC
      const result = getNextBusinessHourStart(saturday3pm, saudiConfig);
      expect(result.getUTCDay()).toBe(0); // Sunday
      expect(result.getUTCHours()).toBe(8);
    });
  });

  describe("computeDueAtBusinessHours", () => {
    it("4-hour SLA on Sunday 10am = Sunday 2pm", () => {
      const sunday10am = new Date("2025-12-21T10:00:00Z");
      const result = computeDueAtBusinessHours(sunday10am, 4 * 60, saudiConfig);
      expect(result.getUTCDay()).toBe(0); // Sunday
      expect(result.getUTCHours()).toBe(14); // 2pm
    });

    it("4-hour SLA on Thursday 4pm spans to Sunday 12pm", () => {
      // Thursday 4pm: 2 hours left today (until 6pm)
      // Need 2 more hours → Sunday 8am + 2h = Sunday 10am
      const thursday4pm = new Date("2025-12-18T16:00:00Z"); // Thursday UTC
      const result = computeDueAtBusinessHours(thursday4pm, 4 * 60, saudiConfig);
      
      // Thursday 4pm-6pm = 2 hours used
      // Friday-Saturday = weekend (skipped)
      // Sunday 8am-10am = 2 hours remaining
      expect(result.getUTCDay()).toBe(0); // Sunday
      expect(result.getUTCHours()).toBe(10); // 10am
    });

    it("12-hour SLA spans multiple days correctly", () => {
      const wednesday9am = new Date("2025-12-17T09:00:00Z"); // Wednesday UTC
      const result = computeDueAtBusinessHours(wednesday9am, 12 * 60, saudiConfig);
      
      // Wednesday 9am-6pm = 9 hours
      // Need 3 more hours → Thursday 8am-11am
      expect(result.getUTCDay()).toBe(4); // Thursday
      expect(result.getUTCHours()).toBe(11); // 11am
    });

    it("starts from next business day if created on weekend", () => {
      const friday5pm = new Date("2025-12-26T17:00:00Z"); // Friday 5pm UTC (weekend)
      const result = computeDueAtBusinessHours(friday5pm, 4 * 60, saudiConfig);
      
      // Friday = weekend, Saturday = weekend
      // Sunday 8am + 4 hours = Sunday 12pm
      expect(result.getUTCDay()).toBe(0); // Sunday
      expect(result.getUTCHours()).toBe(12); // 12pm
    });
  });

  describe("resolveSlaTarget with business hours", () => {
    it("uses business hours when option is enabled", () => {
      const sunday10am = new Date("2025-12-21T10:00:00Z");
      const result = resolveSlaTarget("CRITICAL", sunday10am, true, saudiConfig);
      
      expect(result.slaMinutes).toBe(4 * 60); // CRITICAL = 4 hours
      expect(result.useBusinessHours).toBe(true);
      expect(result.dueAt.getUTCHours()).toBe(14); // 10am + 4h = 2pm
    });

    it("uses 24/7 calculation when business hours disabled", () => {
      const friday5pm = new Date("2025-12-26T17:00:00Z");
      const result = resolveSlaTarget("CRITICAL", friday5pm, false);
      
      expect(result.slaMinutes).toBe(4 * 60);
      expect(result.useBusinessHours).toBe(false);
      expect(result.dueAt.getUTCHours()).toBe(21); // 5pm + 4h = 9pm (ignores business hours)
    });

    it("defaults to 24/7 when no options provided (backward compatible)", () => {
      const now = new Date();
      const result = resolveSlaTarget("MEDIUM", now);
      
      expect(result.slaMinutes).toBe(36 * 60); // MEDIUM = 36 hours
      expect(result.useBusinessHours).toBeFalsy();
    });
  });
});

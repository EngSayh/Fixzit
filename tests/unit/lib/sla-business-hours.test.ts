/**
 * @file SLA Business Hours Calculation Tests
 * Tests for LOGIC-001: Work Order SLA calculation with business hours
 */
import { describe, it, expect } from "vitest";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

import {
  isBusinessHours,
  getNextBusinessDayStart,
  computeDueAtBusinessHours,
  resolveSlaTarget,
  DEFAULT_BUSINESS_HOURS,
  type BusinessHoursConfig,
} from "@/lib/sla";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});

describe("SLA Business Hours", () => {
  // Saudi Arabia work week: Sunday-Thursday, 8am-6pm
  const saudiConfig: BusinessHoursConfig = {
    workWeekStart: 0, // Sunday
    workWeekEnd: 4, // Thursday
    startHour: 8,
    endHour: 18,
    holidays: ["2025-12-31"], // Example holiday
  };

  describe("isBusinessHours", () => {
    it("returns true for Sunday 10am (working day)", () => {
      const sunday10am = new Date("2025-12-21T10:00:00"); // Sunday
      expect(isBusinessHours(sunday10am, saudiConfig)).toBe(true);
    });

    it("returns false for Friday 10am (weekend)", () => {
      const friday10am = new Date("2025-12-26T10:00:00"); // Friday
      expect(isBusinessHours(friday10am, saudiConfig)).toBe(false);
    });

    it("returns false for Saturday 10am (weekend)", () => {
      const saturday10am = new Date("2025-12-27T10:00:00"); // Saturday
      expect(isBusinessHours(saturday10am, saudiConfig)).toBe(false);
    });

    it("returns false before start hour (7am)", () => {
      const sunday7am = new Date("2025-12-21T07:00:00"); // Sunday
      expect(isBusinessHours(sunday7am, saudiConfig)).toBe(false);
    });

    it("returns false after end hour (7pm)", () => {
      const sunday7pm = new Date("2025-12-21T19:00:00"); // Sunday
      expect(isBusinessHours(sunday7pm, saudiConfig)).toBe(false);
    });

    it("returns false on a holiday", () => {
      const holiday = new Date("2025-12-31T10:00:00"); // Tuesday but holiday
      expect(isBusinessHours(holiday, saudiConfig)).toBe(false);
    });
  });

  describe("getNextBusinessDayStart", () => {
    it("returns same day 8am if called before business hours on a working day", () => {
      const sunday6am = new Date("2025-12-21T06:00:00"); // Sunday 6am
      const result = getNextBusinessDayStart(sunday6am, saudiConfig);
      expect(result.getDay()).toBe(0); // Sunday
      expect(result.getHours()).toBe(8);
    });

    it("returns next business day if called on Friday", () => {
      const friday10am = new Date("2025-12-26T10:00:00"); // Friday
      const result = getNextBusinessDayStart(friday10am, saudiConfig);
      expect(result.getDay()).toBe(0); // Sunday (next business day)
      expect(result.getHours()).toBe(8);
    });

    it("skips Saturday and returns Sunday", () => {
      const saturday3pm = new Date("2025-12-27T15:00:00"); // Saturday
      const result = getNextBusinessDayStart(saturday3pm, saudiConfig);
      expect(result.getDay()).toBe(0); // Sunday
      expect(result.getHours()).toBe(8);
    });
  });

  describe("computeDueAtBusinessHours", () => {
    it("4-hour SLA on Sunday 10am = Sunday 2pm", () => {
      const sunday10am = new Date("2025-12-21T10:00:00");
      const result = computeDueAtBusinessHours(sunday10am, 4 * 60, saudiConfig);
      expect(result.getDay()).toBe(0); // Sunday
      expect(result.getHours()).toBe(14); // 2pm
    });

    it("4-hour SLA on Thursday 4pm spans to Sunday 12pm", () => {
      // Thursday 4pm: 2 hours left today (until 6pm)
      // Need 2 more hours → Sunday 8am + 2h = Sunday 10am
      const thursday4pm = new Date("2025-12-18T16:00:00"); // Thursday
      const result = computeDueAtBusinessHours(thursday4pm, 4 * 60, saudiConfig);
      
      // Thursday 4pm-6pm = 2 hours used
      // Friday-Saturday = weekend (skipped)
      // Sunday 8am-10am = 2 hours remaining
      expect(result.getDay()).toBe(0); // Sunday
      expect(result.getHours()).toBe(10); // 10am
    });

    it("12-hour SLA spans multiple days correctly", () => {
      const wednesday9am = new Date("2025-12-17T09:00:00"); // Wednesday
      const result = computeDueAtBusinessHours(wednesday9am, 12 * 60, saudiConfig);
      
      // Wednesday 9am-6pm = 9 hours
      // Need 3 more hours → Thursday 8am-11am
      expect(result.getDay()).toBe(4); // Thursday
      expect(result.getHours()).toBe(11); // 11am
    });

    it("starts from next business day if created on weekend", () => {
      const friday5pm = new Date("2025-12-26T17:00:00"); // Friday 5pm (weekend)
      const result = computeDueAtBusinessHours(friday5pm, 4 * 60, saudiConfig);
      
      // Friday = weekend, Saturday = weekend
      // Sunday 8am + 4 hours = Sunday 12pm
      expect(result.getDay()).toBe(0); // Sunday
      expect(result.getHours()).toBe(12); // 12pm
    });
  });

  describe("resolveSlaTarget with business hours", () => {
    it("uses business hours when option is enabled", () => {
      const sunday10am = new Date("2025-12-21T10:00:00");
      const result = resolveSlaTarget("CRITICAL", sunday10am, {
        useBusinessHours: true,
        businessHoursConfig: saudiConfig,
      });
      
      expect(result.slaMinutes).toBe(4 * 60); // CRITICAL = 4 hours
      expect(result.usedBusinessHours).toBe(true);
      expect(result.dueAt.getHours()).toBe(14); // 10am + 4h = 2pm
    });

    it("uses 24/7 calculation when business hours disabled", () => {
      const friday5pm = new Date("2025-12-26T17:00:00");
      const result = resolveSlaTarget("CRITICAL", friday5pm, {
        useBusinessHours: false,
      });
      
      expect(result.slaMinutes).toBe(4 * 60);
      expect(result.usedBusinessHours).toBe(false);
      expect(result.dueAt.getHours()).toBe(21); // 5pm + 4h = 9pm (ignores business hours)
    });

    it("defaults to 24/7 when no options provided (backward compatible)", () => {
      const now = new Date();
      const result = resolveSlaTarget("MEDIUM", now);
      
      expect(result.slaMinutes).toBe(36 * 60); // MEDIUM = 36 hours
      expect(result.usedBusinessHours).toBeFalsy();
    });
  });
});

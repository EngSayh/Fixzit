// @ts-nocheck
/**
 * Tests for lib/sla.ts - SLA computation for work orders
 * Tests the ACTUAL production values used in the system
 */
import { beforeEach, vi } from "vitest";
import {
  computeSlaMinutes,
  computeDueAt,
  computeDueAtBusinessHours,
  resolveSlaTarget,
  isBusinessHour,
  getNextBusinessHourStart,
  DEFAULT_BUSINESS_HOURS,
  WorkOrderPriority,
} from "@/lib/sla";
// Note: @ts-expect-error usages in this file intentionally feed invalid inputs to verify runtime behavior.

beforeEach(() => {
  vi.clearAllMocks();
});

describe("computeSlaMinutes", () => {
  it("returns 4 hours (240 mins) for CRITICAL priority", () => {
    expect(computeSlaMinutes("CRITICAL")).toBe(4 * 60);
  });

  it("returns 12 hours (720 mins) for HIGH priority", () => {
    expect(computeSlaMinutes("HIGH")).toBe(12 * 60);
  });

  it("returns 1.5 days (2160 mins) for MEDIUM priority", () => {
    expect(computeSlaMinutes("MEDIUM")).toBe(36 * 60);
  });

  it("returns 3 days (4320 mins) for LOW priority", () => {
    expect(computeSlaMinutes("LOW")).toBe(72 * 60);
  });

  it("defaults to MEDIUM (36 hours) for invalid priority", () => {
    expect(computeSlaMinutes("INVALID")).toBe(36 * 60);
  });

  it("defaults to MEDIUM when undefined is passed", () => {
    expect(computeSlaMinutes(undefined)).toBe(36 * 60);
  });
});

describe("computeDueAt", () => {
  const baseDate = new Date("2023-01-01T00:00:00.000Z");
  const baseMs = baseDate.getTime();

  it("adds minutes to a Date instance correctly", () => {
    const minutes = 90; // 1.5 hours
    const result = computeDueAt(baseDate, minutes);
    expect(result.getTime()).toBe(baseMs + minutes * 60 * 1000);
  });

  it("handles zero minutes (returns same date)", () => {
    const result = computeDueAt(baseDate, 0);
    expect(result.getTime()).toBe(baseMs);
  });

  it("supports large SLA windows (e.g., a week)", () => {
    const weekMinutes = 7 * 24 * 60;
    const result = computeDueAt(baseDate, weekMinutes);
    expect(result.getTime()).toBe(baseMs + weekMinutes * 60 * 1000);
  });

  it("accepts negative minutes (date-fns subtracts them)", () => {
    const result = computeDueAt(baseDate, -30);
    expect(result.getTime()).toBe(baseMs - 30 * 60 * 1000);
  });
});

describe("resolveSlaTarget", () => {
  it("returns both slaMinutes and dueAt for CRITICAL priority", () => {
    const start = new Date("2023-01-01T00:00:00.000Z");
    const result = resolveSlaTarget("CRITICAL", start);

    expect(result.slaMinutes).toBe(4 * 60); // 4 hours
    expect(result.dueAt.getTime()).toBe(start.getTime() + 4 * 60 * 60 * 1000);
  });

  it("returns both slaMinutes and dueAt for HIGH priority", () => {
    const start = new Date("2023-01-01T00:00:00.000Z");
    const result = resolveSlaTarget("HIGH", start);

    expect(result.slaMinutes).toBe(12 * 60); // 12 hours
    expect(result.dueAt.getTime()).toBe(start.getTime() + 12 * 60 * 60 * 1000);
  });

  it("uses current date when start is not provided", () => {
    const before = Date.now();
    const result = resolveSlaTarget("MEDIUM");
    const after = Date.now();

    expect(result.slaMinutes).toBe(36 * 60);
    // Due date should be approximately now + 36 hours (with tolerance)
    const dueMs = result.dueAt.getTime();
    expect(dueMs).toBeGreaterThanOrEqual(before + 36 * 60 * 60 * 1000 - 100);
    expect(dueMs).toBeLessThanOrEqual(after + 36 * 60 * 60 * 1000 + 100);
  });
});

// ─────────────────────────────────────────────────────────────
// Business Hours Tests (LOGIC-001)
const makeUtcDate = (isoLocal: string) => new Date(`${isoLocal}Z`);
// ─────────────────────────────────────────────────────────────

describe("isBusinessHour", () => {
  // Sunday 10:00 (work day in Saudi Arabia)
  const sundayMorning = makeUtcDate("2025-01-05T10:00:00");
  // Friday 10:00 (weekend in Saudi Arabia)
  const fridayMorning = makeUtcDate("2025-01-10T10:00:00");
  // Sunday 06:00 (before business hours)
  const sundayEarly = makeUtcDate("2025-01-05T06:00:00");
  // Sunday 18:00 (after business hours)
  const sundayLate = makeUtcDate("2025-01-05T18:00:00");

  it("returns true for Sunday 10:00 (work day, within hours)", () => {
    expect(isBusinessHour(sundayMorning)).toBe(true);
  });

  it("returns false for Friday 10:00 (weekend)", () => {
    expect(isBusinessHour(fridayMorning)).toBe(false);
  });

  it("returns false for Sunday 06:00 (before start)", () => {
    expect(isBusinessHour(sundayEarly)).toBe(false);
  });

  it("returns false for Sunday 18:00 (after end)", () => {
    expect(isBusinessHour(sundayLate)).toBe(false);
  });
});

describe("getNextBusinessHourStart", () => {
  it("returns same time if already in business hours", () => {
    const sundayNoon = makeUtcDate("2025-01-05T12:00:00");
    const result = getNextBusinessHourStart(sundayNoon);
    expect(result.getTime()).toBe(sundayNoon.getTime());
  });

  it("jumps to 08:00 if before start on work day", () => {
    const sundayEarly = makeUtcDate("2025-01-05T06:00:00");
    const result = getNextBusinessHourStart(sundayEarly);
    expect(result.getUTCHours()).toBe(8);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCDate()).toBe(5); // Same day
  });

  it("jumps to next work day if after hours", () => {
    const sundayLate = makeUtcDate("2025-01-05T18:00:00");
    const result = getNextBusinessHourStart(sundayLate);
    expect(result.getUTCHours()).toBe(8);
    expect(result.getUTCDate()).toBe(6); // Monday
  });

  it("skips weekend (Friday/Saturday) to Sunday", () => {
    const thursdayLate = makeUtcDate("2025-01-09T18:00:00"); // Thursday after hours
    const result = getNextBusinessHourStart(thursdayLate);
    expect(result.getUTCDay()).toBe(0); // Sunday
    expect(result.getUTCHours()).toBe(8);
  });
});

describe("computeDueAtBusinessHours", () => {
  it("adds 4 hours within same business day", () => {
    const sundayMorning = makeUtcDate("2025-01-05T09:00:00"); // 9am Sunday
    const result = computeDueAtBusinessHours(sundayMorning, 4 * 60); // 4 hours
    expect(result.getUTCHours()).toBe(13); // 1pm same day
    expect(result.getUTCDate()).toBe(5);
  });

  it("spills over to next day if exceeds today", () => {
    const sundayAfternoon = makeUtcDate("2025-01-05T15:00:00"); // 3pm Sunday
    const result = computeDueAtBusinessHours(sundayAfternoon, 4 * 60); // 4 hours
    // 2 hours left today (15:00-17:00), 2 hours tomorrow (08:00-10:00)
    expect(result.getUTCHours()).toBe(10);
    expect(result.getUTCDate()).toBe(6); // Monday
  });

  it("skips weekend correctly", () => {
    // Thursday 4pm, 4-hour SLA → should be Sunday 10am (skip Fri/Sat)
    const thursdayAfternoon = makeUtcDate("2025-01-09T16:00:00");
    const result = computeDueAtBusinessHours(thursdayAfternoon, 4 * 60);
    // 1 hour Thursday (16:00-17:00), 3 hours Sunday (08:00-11:00)
    expect(result.getUTCDay()).toBe(0); // Sunday
    expect(result.getUTCHours()).toBe(11);
  });

  it("handles multi-day SLA correctly", () => {
    // 12-hour SLA from Sunday 9am
    const sundayMorning = makeUtcDate("2025-01-05T09:00:00");
    const result = computeDueAtBusinessHours(sundayMorning, 12 * 60);
    // 8 hours Sunday (09:00-17:00), 4 hours Monday (08:00-12:00)
    expect(result.getUTCDate()).toBe(6); // Monday
    expect(result.getUTCHours()).toBe(12);
  });
});

describe("resolveSlaTarget with business hours", () => {
  it("returns useBusinessHours flag when enabled", () => {
    const start = makeUtcDate("2025-01-05T09:00:00");
    const result = resolveSlaTarget("CRITICAL", start, true);
    expect(result.useBusinessHours).toBe(true);
  });

  it("calculates business hours due date when flag is true", () => {
    const thursdayAfternoon = makeUtcDate("2025-01-09T16:00:00");
    const result = resolveSlaTarget("CRITICAL", thursdayAfternoon, true);
    // 4-hour CRITICAL SLA, skips weekend
    expect(result.dueAt.getUTCDay()).toBe(0); // Sunday
  });

  it("uses 24/7 calculation when flag is false", () => {
    const thursdayAfternoon = makeUtcDate("2025-01-09T16:00:00");
    const result = resolveSlaTarget("CRITICAL", thursdayAfternoon, false);
    // 4 hours from Thursday 4pm = Thursday 8pm
    expect(result.dueAt.getUTCHours()).toBe(20);
    expect(result.dueAt.getUTCDay()).toBe(4); // Thursday
  });
});

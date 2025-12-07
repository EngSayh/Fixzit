// @ts-nocheck
/**
 * Tests for lib/sla.ts - SLA computation for work orders
 * Tests the ACTUAL production values used in the system
 */
import {
  computeSlaMinutes,
  computeDueAt,
  resolveSlaTarget,
  WorkOrderPriority,
} from "./sla";
// Note: @ts-expect-error usages in this file intentionally feed invalid inputs to verify runtime behavior.

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

// Tests for src/lib/sla.ts
// Framework note: Jest-style tests. Compatible with Vitest in most cases.
import { computeSlaMinutes, computeDueAt } from '../sla';

describe('computeSlaMinutes', () => {
  it('returns 240 minutes for URGENT', () => {
    expect(computeSlaMinutes('URGENT')).toBe(240);
  });

  it('is case-insensitive and handles "High"', () => {
    expect(computeSlaMinutes('High')).toBe(24 * 60);
  });

  it('returns 3 days for MEDIUM', () => {
    expect(computeSlaMinutes('MEDIUM')).toBe(3 * 24 * 60);
  });

  it('returns 7 days for LOW', () => {
    expect(computeSlaMinutes('LOW')).toBe(7 * 24 * 60);
  });

  it('defaults to 3 days for unknown priority', () => {
    expect(computeSlaMinutes('UNKNOWN')).toBe(3 * 24 * 60);
  });

  it('handles empty string as default (3 days)', () => {
    expect(computeSlaMinutes('')).toBe(3 * 24 * 60);
  });

  it('handles null/undefined gracefully using default (3 days)', () => {
    expect(computeSlaMinutes(undefined as unknown as string)).toBe(3 * 24 * 60);
    expect(computeSlaMinutes(null as unknown as string)).toBe(3 * 24 * 60);
  });
});

describe('computeDueAt', () => {
  const baseISOString = '2023-01-01T00:00:00.000Z';
  const baseDate = new Date(baseISOString);
  const baseMs = baseDate.getTime();

  it('adds minutes to a Date instance correctly', () => {
    const minutes = 90; // 1.5 hours
    const result = computeDueAt(baseDate, minutes);
    expect(result.getTime()).toBe(baseMs + minutes * 60 * 1000);
  });

  it('accepts ISO date string input', () => {
    const minutes = 60;
    const result = computeDueAt(baseISOString, minutes);
    expect(result.getTime()).toBe(baseMs + minutes * 60 * 1000);
  });

  it('accepts epoch milliseconds input', () => {
    const minutes = 15;
    const result = computeDueAt(baseMs, minutes);
    expect(result.getTime()).toBe(baseMs + minutes * 60 * 1000);
  });

  it('clamps negative SLA minutes to zero (no subtraction)', () => {
    const result = computeDueAt(baseDate, -30);
    expect(result.getTime()).toBe(baseMs);
  });

  it('handles zero minutes (returns base date)', () => {
    const result = computeDueAt(baseDate, 0);
    expect(result.getTime()).toBe(baseMs);
  });

  it('supports large SLA minutes (e.g., a week)', () => {
    const weekMinutes = 7 * 24 * 60;
    const result = computeDueAt(baseDate, weekMinutes);
    expect(result.getTime()).toBe(baseMs + weekMinutes * 60 * 1000);
  });

  it('produces Invalid Date when createdAt is invalid', () => {
    const invalid = computeDueAt('not-a-date', 10);
    // getTime() returns NaN for Invalid Date
    expect(Number.isNaN(invalid.getTime())).toBe(true);
  });

  it('uses current time when createdAt is falsy/undefined', () => {
    // Use spy to stabilize Date.now()
    const fixedNow = new Date('2024-06-01T12:00:00.000Z').getTime();
    const originalNow = Date.now;
    // Minimal spy without relying on jest.fn for compatibility
    // In Jest, you can use jest.spyOn(Date, 'now').mockReturnValue(fixedNow)
    // In Vitest, vi.setSystemTime can be used instead.
    // Here we monkey-patch for portability.
    // @ts-ignore
    Date.now = () => fixedNow;

    try {
      const minutes = 30;
      const result = computeDueAt(undefined as unknown as Date, minutes);
      expect(result.getTime()).toBe(fixedNow + minutes * 60 * 1000);
    } finally {
      // restore
      // @ts-ignore
      Date.now = originalNow;
    }
  });

  it('accepts fractional minutes (adds fractional milliseconds)', () => {
    const minutes = 2.5;
    const result = computeDueAt(baseDate, minutes);
    expect(result.getTime()).toBe(baseMs + minutes * 60 * 1000);
  });
});
/**
 * Test framework: Jest + TypeScript
 * These tests validate computeSlaMinutes and computeDueAt, covering happy paths, edge cases, and failure-like inputs.
 * If your project uses Vitest, you can run them as-is in most cases, or replace jest-specific globals accordingly.
 */

import { computeSlaMinutes, computeDueAt } from '../sla';

describe('computeSlaMinutes', () => {
  it('returns 240 for URGENT (case-insensitive)', () => {
    expect(computeSlaMinutes('URGENT')).toBe(240);
    expect(computeSlaMinutes('urgent')).toBe(240);
    expect(computeSlaMinutes('UrGeNt')).toBe(240);
  });

  it('returns 1440 for HIGH (1 day)', () => {
    expect(computeSlaMinutes('HIGH')).toBe(24 * 60);
  });

  it('returns 4320 for MEDIUM (3 days)', () => {
    expect(computeSlaMinutes('MEDIUM')).toBe(3 * 24 * 60);
  });

  it('returns 10080 for LOW (7 days)', () => {
    expect(computeSlaMinutes('LOW')).toBe(7 * 24 * 60);
  });

  it('defaults to 4320 (3 days) for unknown priorities', () => {
    expect(computeSlaMinutes('UNKNOWN')).toBe(3 * 24 * 60);
    expect(computeSlaMinutes('')).toBe(3 * 24 * 60);
  });

  it('handles nullish values gracefully (defaults to 3 days)', () => {
    // @ts-expect-error testing runtime behavior for undefined
    expect(computeSlaMinutes(undefined)).toBe(3 * 24 * 60);
    // @ts-expect-error testing runtime behavior for null
    expect(computeSlaMinutes(null)).toBe(3 * 24 * 60);
  });
});

describe('computeDueAt', () => {
  it('adds the SLA minutes to a Date input (happy path)', () => {
    const created = new Date('2024-01-01T00:00:00.000Z');
    const due = computeDueAt(created, 60);
    expect(due.toISOString()).toBe('2024-01-01T01:00:00.000Z');
  });

  it('accepts string createdAt and parses correctly', () => {
    const due = computeDueAt('2024-01-01T00:00:00.000Z', 30);
    expect(due.toISOString()).toBe('2024-01-01T00:30:00.000Z');
  });

  it('accepts numeric timestamp createdAt (ms since epoch)', () => {
    const base = Date.parse('2024-01-01T00:00:00.000Z');
    const due = computeDueAt(base, 90);
    expect(due.toISOString()).toBe('2024-01-01T01:30:00.000Z');
  });

  it('treats negative SLA minutes as zero (no subtraction)', () => {
    const created = new Date('2024-01-01T00:00:00.000Z');
    const due = computeDueAt(created, -120);
    expect(due.toISOString()).toBe('2024-01-01T00:00:00.000Z');
  });

  it('handles zero SLA minutes (returns createdAt)', () => {
    const created = new Date('2024-01-01T00:00:00.000Z');
    const due = computeDueAt(created, 0);
    expect(due.toISOString()).toBe('2024-01-01T00:00:00.000Z');
  });

  it('handles very large SLA minutes without precision loss in minutes-to-ms conversion', () => {
    const created = new Date('2024-01-01T00:00:00.000Z');
    const minutes = 365 * 24 * 60; // 1 year approximate
    const due = computeDueAt(created, minutes);
    expect(due.getTime()).toBe(created.getTime() + minutes * 60 * 1000);
  });

  it('uses current time when createdAt is falsy', () => {
    // Freeze Date.now to a fixed instant for determinism
    const fixedNow = Date.parse('2024-01-01T12:00:00.000Z');
    const realNow = Date.now;
    // @ts-ignore
    Date.now = () => fixedNow;

    try {
      // @ts-expect-error deliberately passing undefined
      const due = computeDueAt(undefined, 15);
      expect(due.getTime()).toBe(fixedNow + 15 * 60 * 1000);
    } finally {
      // restore
      // @ts-ignore
      Date.now = realNow;
    }
  });

  it('handles NaN Date from invalid string by relying on native Date behavior', () => {
    // Invalid date strings create an Invalid Date whose getTime() is NaN; adding yields NaN, which results in Invalid Date.
    const due = computeDueAt('not-a-date', 10);
    expect(Number.isNaN(due.getTime())).toBe(true);
  });
});
/**
 * @fileoverview Business Hours SLA Calculator Tests
 * @module tests/unit/lib/sla/business-hours
 * @see Issue #293 - Technical Debt: Complete TODO Items
 */

import { describe, it, expect } from 'vitest';
import {
  calculateSLADeadline,
  isBusinessHour,
  isHoliday,
  getNextBusinessHourStart,
  getRemainingBusinessHoursToday,
  SAUDI_DEFAULTS,
  type BusinessHoursConfig,
  type Holiday,
} from '@/lib/sla/business-hours';
import { Types } from 'mongoose';

// Test config using Saudi defaults
const testConfig: BusinessHoursConfig = {
  orgId: new Types.ObjectId(),
  ...SAUDI_DEFAULTS,
};

/**
 * Get time parts in the test config's timezone for assertions
 * This ensures tests pass regardless of the machine's local timezone
 */
function getTimePartsInTestTZ(date: Date): {
  weekday: string;
  day: number;
  hour: number;
  minute: number;
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: testConfig.timezone,
    weekday: 'long',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    weekday: String(lookup.weekday),
    day: Number(lookup.day),
    hour: Number(lookup.hour),
    minute: Number(lookup.minute),
  };
}

describe('business-hours', () => {
  describe('isHoliday', () => {
    const holidays: Holiday[] = [
      { date: '2026-09-23', name: 'Saudi National Day', recurring: true },
      { date: '2026-04-01', name: 'Eid al-Fitr', recurring: false },
    ];

    it('should return true for exact holiday match', () => {
      const date = new Date('2026-04-01T10:00:00');
      expect(isHoliday(date, holidays)).toBe(true);
    });

    it('should return true for recurring holiday in any year', () => {
      // September 23 is Saudi National Day (recurring)
      const date2025 = new Date('2025-09-23T10:00:00');
      const date2027 = new Date('2027-09-23T10:00:00');
      expect(isHoliday(date2025, holidays)).toBe(true);
      expect(isHoliday(date2027, holidays)).toBe(true);
    });

    it('should return false for non-recurring holiday in different year', () => {
      // Eid al-Fitr 2026 is not recurring, so 2027 should be false
      const date = new Date('2027-04-01T10:00:00');
      expect(isHoliday(date, holidays)).toBe(false);
    });

    it('should return false for regular working day', () => {
      const date = new Date('2026-03-15T10:00:00'); // Random weekday
      expect(isHoliday(date, holidays)).toBe(false);
    });
  });

  describe('isBusinessHour', () => {
    it('should return true during business hours on a working day', () => {
      // Sunday 10:00 AM (Sunday is a working day in Saudi Arabia)
      const date = new Date('2026-01-04T10:00:00'); // Sunday
      expect(isBusinessHour(date, testConfig)).toBe(true);
    });

    it('should return false on Friday (weekend in Saudi Arabia)', () => {
      const date = new Date('2026-01-09T10:00:00'); // Friday
      expect(isBusinessHour(date, testConfig)).toBe(false);
    });

    it('should return false on Saturday (weekend in Saudi Arabia)', () => {
      const date = new Date('2026-01-10T10:00:00'); // Saturday
      expect(isBusinessHour(date, testConfig)).toBe(false);
    });

    it('should return false before business hours start', () => {
      const date = new Date('2026-01-04T07:30:00'); // Sunday 7:30 AM (before 8 AM)
      expect(isBusinessHour(date, testConfig)).toBe(false);
    });

    it('should return false after business hours end', () => {
      const date = new Date('2026-01-04T17:30:00'); // Sunday 5:30 PM (after 5 PM)
      expect(isBusinessHour(date, testConfig)).toBe(false);
    });

    it('should return true at exactly 8:00 AM', () => {
      const date = new Date('2026-01-04T08:00:00'); // Sunday 8:00 AM
      expect(isBusinessHour(date, testConfig)).toBe(true);
    });

    it('should return false at exactly 5:00 PM (end of day)', () => {
      const date = new Date('2026-01-04T17:00:00'); // Sunday 5:00 PM (17:00 is end, not included)
      expect(isBusinessHour(date, testConfig)).toBe(false);
    });
  });

  describe('getNextBusinessHourStart', () => {
    it('should return same time if already within business hours', () => {
      const date = new Date('2026-01-04T10:00:00'); // Sunday 10 AM
      const result = getNextBusinessHourStart(date, testConfig);
      expect(result.getTime()).toBe(date.getTime());
    });

    it('should return 8 AM same day if before business hours', () => {
      const date = new Date('2026-01-04T06:00:00'); // Sunday 6 AM
      const result = getNextBusinessHourStart(date, testConfig);
      const parts = getTimePartsInTestTZ(result);
      expect(parts.hour).toBe(8);
      expect(parts.minute).toBe(0);
      expect(parts.day).toBe(4);
    });

    it('should return next working day 8 AM if after business hours', () => {
      const date = new Date('2026-01-04T18:00:00'); // Sunday 6 PM
      const result = getNextBusinessHourStart(date, testConfig);
      const parts = getTimePartsInTestTZ(result);
      expect(parts.hour).toBe(8);
      expect(parts.minute).toBe(0);
      expect(parts.day).toBe(5); // Monday
    });

    it('should skip Friday/Saturday and return Sunday', () => {
      const date = new Date('2026-01-08T18:00:00'); // Thursday 6 PM
      const result = getNextBusinessHourStart(date, testConfig);
      const parts = getTimePartsInTestTZ(result);
      expect(parts.weekday).toBe('Sunday');
      expect(parts.hour).toBe(8);
    });
  });

  describe('getRemainingBusinessHoursToday', () => {
    it('should return 0 outside business hours', () => {
      const date = new Date('2026-01-09T10:00:00'); // Friday (weekend)
      expect(getRemainingBusinessHoursToday(date, testConfig)).toBe(0);
    });

    it('should return correct hours remaining during business hours', () => {
      const date = new Date('2026-01-04T12:00:00'); // Sunday 12:00 PM
      // From 12:00 to 17:00 = 5 hours
      expect(getRemainingBusinessHoursToday(date, testConfig)).toBe(5);
    });

    it('should return full day hours at start of business day', () => {
      const date = new Date('2026-01-04T08:00:00'); // Sunday 8:00 AM
      // From 08:00 to 17:00 = 9 hours
      expect(getRemainingBusinessHoursToday(date, testConfig)).toBe(9);
    });
  });

  describe('calculateSLADeadline', () => {
    it('should calculate simple same-day SLA', () => {
      // Sunday 9 AM + 4 hours SLA = Sunday 1 PM
      const createdAt = new Date('2026-01-04T09:00:00');
      const result = calculateSLADeadline(createdAt, 4, testConfig);
      const parts = getTimePartsInTestTZ(result.deadline);
      
      expect(result.businessHoursUsed).toBe(4);
      expect(parts.hour).toBe(13); // 1 PM
      expect(parts.day).toBe(4); // Same day
    });

    it('should span multiple days when SLA exceeds remaining hours', () => {
      // Sunday 3 PM + 8 hours SLA (only 2 hours left today)
      // = 2 hours Sunday + 6 hours Monday = Monday 2 PM
      const createdAt = new Date('2026-01-04T15:00:00');
      const result = calculateSLADeadline(createdAt, 8, testConfig);
      const parts = getTimePartsInTestTZ(result.deadline);
      
      expect(result.businessHoursUsed).toBe(8);
      expect(parts.day).toBe(5); // Monday
      expect(parts.hour).toBe(14); // 2 PM
    });

    it('should skip weekends (Friday/Saturday)', () => {
      // Thursday 4 PM + 4 hours SLA
      // = 1 hour Thursday + skip Fri/Sat + 3 hours Sunday = Sunday 11 AM
      const createdAt = new Date('2026-01-08T16:00:00'); // Thursday 4 PM
      const result = calculateSLADeadline(createdAt, 4, testConfig);
      const parts = getTimePartsInTestTZ(result.deadline);
      
      expect(parts.weekday).toBe('Sunday');
      expect(result.breakdown.length).toBeGreaterThan(1);
    });

    it('should start from next business hour if created outside business hours', () => {
      // Saturday 10 AM + 2 hours SLA = Sunday 10 AM (starts at 8 AM + 2 hours)
      const createdAt = new Date('2026-01-03T10:00:00'); // Saturday
      const result = calculateSLADeadline(createdAt, 2, testConfig);
      const parts = getTimePartsInTestTZ(result.deadline);
      
      expect(parts.weekday).toBe('Sunday');
      expect(parts.hour).toBe(10); // 10 AM
    });

    it('should track breakdown correctly', () => {
      const createdAt = new Date('2026-01-04T14:00:00'); // Sunday 2 PM
      const result = calculateSLADeadline(createdAt, 12, testConfig);
      
      // Should have breakdown entries
      expect(result.breakdown.length).toBeGreaterThan(0);
      
      // Total hours worked should equal SLA hours
      const totalWorked = result.breakdown.reduce((sum, day) => sum + day.hoursWorked, 0);
      expect(totalWorked).toBe(12);
    });

    it('should calculate calendar hours elapsed', () => {
      const createdAt = new Date('2026-01-08T16:00:00'); // Thursday 4 PM
      const result = calculateSLADeadline(createdAt, 4, testConfig);
      
      // Should have calendar hours > business hours due to weekend
      expect(result.calendarHoursUsed).toBeGreaterThan(result.businessHoursUsed);
    });
  });
});

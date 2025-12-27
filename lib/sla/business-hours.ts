/**
 * LOGIC-001: Business Hours SLA Calculator
 * 
 * @status SCAFFOLDING - Q1 2026
 * @problem SLA deadlines currently use 24/7 calculation
 * @solution Implement business hours calendar with timezone support
 * 
 * Example:
 * - 4-hour SLA created Friday 4pm → Monday 12pm (not Friday 8pm)
 * - Respects org-specific working hours and holidays
 */

import { Types } from 'mongoose';

// ============================================================================
// TYPES
// ============================================================================

export interface BusinessHoursConfig {
  orgId: Types.ObjectId;
  /** @todo Timezone support scheduled for Q1 2026 - calculations currently use local time */
  // timezone: string; // e.g., 'Asia/Riyadh' - NOT YET IMPLEMENTED
  workingDays: WeekDay[];
  workingHours: {
    start: string; // e.g., '08:00'
    end: string;   // e.g., '17:00'
  };
  holidays: Holiday[];
}

export type WeekDay = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export interface Holiday {
  date: string; // ISO date: 'YYYY-MM-DD'
  name: string;
  recurring: boolean; // true for annual holidays
}

export interface SLACalculationResult {
  deadline: Date;
  businessHoursUsed: number;
  calendarHoursUsed: number;
  breakdown: SLABreakdownItem[];
}

export interface SLABreakdownItem {
  date: string;
  hoursWorked: number;
  isWorkingDay: boolean;
  isHoliday: boolean;
}

// ============================================================================
// DEFAULT CONFIGS
// ============================================================================

/**
 * Saudi Arabia default business hours
 * - Sunday-Thursday working days
 * - Friday-Saturday weekend
 * - 8:00 AM - 5:00 PM
 * @note Timezone support not yet implemented - calculations use local time
 */
export const SAUDI_DEFAULTS: Omit<BusinessHoursConfig, 'orgId'> = {
  // timezone: 'Asia/Riyadh', // NOT YET IMPLEMENTED - scheduled for Q1 2026
  workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
  workingHours: {
    start: '08:00',
    end: '17:00',
  },
  holidays: [
    { date: '2026-04-01', name: 'Eid al-Fitr', recurring: false },
    { date: '2026-04-02', name: 'Eid al-Fitr', recurring: false },
    { date: '2026-04-03', name: 'Eid al-Fitr', recurring: false },
    { date: '2026-06-07', name: 'Eid al-Adha', recurring: false },
    { date: '2026-06-08', name: 'Eid al-Adha', recurring: false },
    { date: '2026-06-09', name: 'Eid al-Adha', recurring: false },
    { date: '2026-06-10', name: 'Eid al-Adha', recurring: false },
    { date: '2026-09-23', name: 'Saudi National Day', recurring: true },
  ],
};

// ============================================================================
// NOT IMPLEMENTED ERROR
// ============================================================================

/**
 * Error thrown when a stub function is called.
 * AGENTS.md: Non-negotiable rule - no silent failures, no placeholder returns.
 */
export class SLANotImplementedError extends Error {
  constructor(functionName: string) {
    super(
      `[FIXZIT-SLA-001] ${functionName} is not yet implemented. ` +
      `Business hours SLA calculation is scheduled for Q1 2026. ` +
      `For now, use 24/7 SLA calculation without business hours adjustment.`
    );
    this.name = 'SLANotImplementedError';
  }
}

// ============================================================================
// PLACEHOLDER FUNCTIONS (TO BE IMPLEMENTED Q1 2026)
// ============================================================================

/**
 * Calculate SLA deadline considering business hours
 * @throws {SLANotImplementedError} Always - not yet implemented
 * @todo Implement with proper timezone handling (date-fns-tz)
 */
export function calculateSLADeadline(
  _createdAt: Date,
  _slaHours: number,
  _config: BusinessHoursConfig
): SLACalculationResult {
  // TODO: Implement business hours calculation
  // 1. Convert createdAt to org timezone
  // 2. If outside business hours, start from next business hour
  // 3. Count only business hours toward SLA
  // 4. Skip holidays and weekends
  // 5. Return deadline in UTC
  
  throw new SLANotImplementedError('calculateSLADeadline');
}

/**
 * Check if a given time is within business hours
 * @throws {SLANotImplementedError} Always - not yet implemented
 */
export function isBusinessHour(
  _dateTime: Date,
  _config: BusinessHoursConfig
): boolean {
  throw new SLANotImplementedError('isBusinessHour');
}

/**
 * Get next business hour start time
 * @throws {SLANotImplementedError} Always - not yet implemented
 */
export function getNextBusinessHourStart(
  _fromDate: Date,
  _config: BusinessHoursConfig
): Date {
  throw new SLANotImplementedError('getNextBusinessHourStart');
}

/**
 * Check if a date is a holiday
 * @throws {SLANotImplementedError} Always - not yet implemented
 */
export function isHoliday(
  _date: Date,
  _holidays: Holiday[]
): boolean {
  throw new SLANotImplementedError('isHoliday');
}

/**
 * Get remaining business hours in current day
 * @throws {SLANotImplementedError} Always - not yet implemented
 */
export function getRemainingBusinessHoursToday(
  _fromTime: Date,
  _config: BusinessHoursConfig
): number {
  throw new SLANotImplementedError('getRemainingBusinessHoursToday');
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  calculateSLADeadline,
  isBusinessHour,
  getNextBusinessHourStart,
  isHoliday,
  getRemainingBusinessHoursToday,
  SAUDI_DEFAULTS,
  SLANotImplementedError,
};

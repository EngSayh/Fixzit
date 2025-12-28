/**
 * Business Hours SLA Calculator
 * 
 * @status IMPLEMENTED - Issue #293
 * @description Calculates SLA deadlines considering business hours, weekends, and holidays
 * 
 * Features:
 * - 4-hour SLA created Friday 4pm → Monday 12pm (not Friday 8pm)
 * - Respects org-specific working hours and holidays
 * - Saudi Arabia defaults (Sun-Thu, 8am-5pm)
 * - Holiday support including recurring annual holidays
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
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse time string (HH:mm) to hours and minutes
 */
function parseTime(time: string): { hours: number; minutes: number } {
  const [hours, minutes] = time.split(':').map(Number);
  return { hours, minutes };
}

/**
 * Get date parts in a specific timezone using Intl.DateTimeFormat
 * This ensures proper timezone handling for SLA calculations
 */
function getDatePartsInTimeZone(
  date: Date,
  timeZone: string
): {
  weekday: WeekDay;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    weekday: (lookup.weekday as string).toLowerCase() as WeekDay,
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(lookup.hour),
    minute: Number(lookup.minute),
  };
}

/**
 * Get day of week name from date, respecting timezone
 */
function getDayName(date: Date, timeZone: string): WeekDay {
  return getDatePartsInTimeZone(date, timeZone).weekday;
}

/**
 * Set the time portion of a Date to a specific hour/minute in the given timezone.
 * This correctly accounts for timezone offset when setting the UTC time.
 * 
 * @param date - The Date to modify (mutates in place)
 * @param hours - Target hour in the given timezone (0-23)
 * @param minutes - Target minutes in the given timezone (0-59)
 * @param timeZone - The timezone to interpret hours/minutes in
 */
function setTimeInTimeZone(
  date: Date,
  hours: number,
  minutes: number,
  timeZone: string
): void {
  // Get the current date parts in the target timezone
  const parts = getDatePartsInTimeZone(date, timeZone);
  
  // Create an ISO string for the target time in the target timezone
  // We use a temporary date to compute the correct UTC offset
  const tempDate = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, hours, minutes, 0, 0)
  );
  
  // Get what time this shows in the target timezone
  const tempParts = getDatePartsInTimeZone(tempDate, timeZone);
  
  // The difference between what we wanted and what we got tells us the offset
  const offsetHours = tempParts.hour - hours;
  const offsetMinutes = tempParts.minute - minutes;
  
  // Adjust for the offset
  const targetUTCHours = hours - offsetHours;
  const targetUTCMinutes = minutes - offsetMinutes;
  
  date.setUTCHours(targetUTCHours, targetUTCMinutes, 0, 0);
}

/**
 * Format date as ISO date string (YYYY-MM-DD), respecting timezone
 */
function formatDateOnly(date: Date, timeZone: string): string {
  const parts = getDatePartsInTimeZone(date, timeZone);
  const month = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');
  return `${parts.year}-${month}-${day}`;
}

/**
 * Get business hours for a working day in milliseconds
 */
function getBusinessHoursPerDay(config: BusinessHoursConfig): number {
  const start = parseTime(config.workingHours.start);
  const end = parseTime(config.workingHours.end);
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;
  return (endMinutes - startMinutes) / 60; // Return hours
}

// ============================================================================
// IMPLEMENTED FUNCTIONS
// ============================================================================

/**
 * Check if a date is a holiday
 * @param date - The date to check
 * @param holidays - List of holidays to check against
 * @param timeZone - Timezone for date comparison (defaults to UTC)
 * @returns true if the date is a holiday
 */
export function isHoliday(
  date: Date,
  holidays: Holiday[],
  timeZone = 'UTC'
): boolean {
  const dateStr = formatDateOnly(date, timeZone);
  
  return holidays.some(holiday => {
    if (holiday.recurring) {
      // For recurring holidays, check month and day only
      const holidayDate = holiday.date.slice(5); // Get MM-DD part
      const checkDate = dateStr.slice(5);
      return holidayDate === checkDate;
    } else {
      // For non-recurring, exact match
      return holiday.date === dateStr;
    }
  });
}

/**
 * Check if a given time is within business hours
 * @param dateTime - The date/time to check (in any timezone, will be treated as-is)
 * @param config - Business hours configuration
 * @returns true if within business hours
 */
export function isBusinessHour(
  dateTime: Date,
  config: BusinessHoursConfig
): boolean {
  // Check if it's a working day (using configured timezone)
  const dayName = getDayName(dateTime, config.timezone);
  if (!config.workingDays.includes(dayName)) {
    return false;
  }
  
  // Check if it's a holiday (using configured timezone)
  if (isHoliday(dateTime, config.holidays, config.timezone)) {
    return false;
  }
  
  // Check if within working hours (using configured timezone)
  const start = parseTime(config.workingHours.start);
  const end = parseTime(config.workingHours.end);
  
  const { hour: currentHour, minute: currentMinute } = getDatePartsInTimeZone(
    dateTime,
    config.timezone
  );
  const currentTimeMinutes = currentHour * 60 + currentMinute;
  
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;
  
  return currentTimeMinutes >= startMinutes && currentTimeMinutes < endMinutes;
}

/**
 * Get next business hour start time
 * @param fromDate - Starting date/time
 * @param config - Business hours configuration
 * @returns Next date/time when business hours start
 */
export function getNextBusinessHourStart(
  fromDate: Date,
  config: BusinessHoursConfig
): Date {
  const result = new Date(fromDate);
  const start = parseTime(config.workingHours.start);
  const end = parseTime(config.workingHours.end);
  
  // Maximum iterations to prevent infinite loop (7 days + buffer)
  const maxIterations = 14;
  let iterations = 0;
  
  while (iterations < maxIterations) {
    iterations++;
    const dayName = getDayName(result, config.timezone);
    
    // Check if it's a working day and not a holiday
    if (config.workingDays.includes(dayName) && !isHoliday(result, config.holidays, config.timezone)) {
      const { hour: currentHour, minute: currentMinute } = getDatePartsInTimeZone(
        result,
        config.timezone
      );
      const currentTimeMinutes = currentHour * 60 + currentMinute;
      const startMinutes = start.hours * 60 + start.minutes;
      const endMinutes = end.hours * 60 + end.minutes;
      
      // If before business hours start, return start time today
      if (currentTimeMinutes < startMinutes) {
        setTimeInTimeZone(result, start.hours, start.minutes, config.timezone);
        return result;
      }
      
      // If within business hours, return current time
      if (currentTimeMinutes >= startMinutes && currentTimeMinutes < endMinutes) {
        return result;
      }
    }
    
    // Move to next day at business hours start
    result.setUTCDate(result.getUTCDate() + 1);
    setTimeInTimeZone(result, start.hours, start.minutes, config.timezone);
  }
  
  // Fallback (should never reach here with valid config)
  return result;
}

/**
 * Get remaining business hours in current day
 * @param fromTime - Current time
 * @param config - Business hours configuration
 * @returns Remaining business hours (0 if outside business hours)
 */
export function getRemainingBusinessHoursToday(
  fromTime: Date,
  config: BusinessHoursConfig
): number {
  if (!isBusinessHour(fromTime, config)) {
    return 0;
  }
  
  const end = parseTime(config.workingHours.end);
  const endMinutes = end.hours * 60 + end.minutes;
  const { hour: currentHour, minute: currentMinute } = getDatePartsInTimeZone(
    fromTime,
    config.timezone
  );
  const currentMinutes = currentHour * 60 + currentMinute;
  
  return Math.max(0, (endMinutes - currentMinutes) / 60);
}

/**
 * Calculate SLA deadline considering business hours
 * 
 * Implements proper business hours calculation:
 * 1. If created outside business hours, start counting from next business hour
 * 2. Count only business hours toward SLA
 * 3. Skip holidays and weekends
 * 4. Track breakdown for auditing
 * 
 * @param createdAt - When the SLA timer starts
 * @param slaHours - Number of business hours for the SLA
 * @param config - Business hours configuration
 * @returns SLA calculation result with deadline and breakdown
 */
export function calculateSLADeadline(
  createdAt: Date,
  slaHours: number,
  config: BusinessHoursConfig
): SLACalculationResult {
  const breakdown: SLABreakdownItem[] = [];
  let remainingHours = slaHours;
  // Date object is mutated during iteration, but reference doesn't change
  // eslint-disable-next-line prefer-const -- Date object is mutated, not reassigned
  let currentDate = getNextBusinessHourStart(new Date(createdAt), config);
  const startDate = new Date(createdAt);
  
  const hoursPerDay = getBusinessHoursPerDay(config);
  const maxDays = Math.ceil(slaHours / hoursPerDay) + 30; // Safety limit
  let daysProcessed = 0;
  
  while (remainingHours > 0 && daysProcessed < maxDays) {
    daysProcessed++;
    const dayName = getDayName(currentDate, config.timezone);
    const dateStr = formatDateOnly(currentDate, config.timezone);
    const isWorkDay = config.workingDays.includes(dayName);
    const isHolidayDay = isHoliday(currentDate, config.holidays, config.timezone);
    
    if (!isWorkDay || isHolidayDay) {
      // Non-working day
      breakdown.push({
        date: dateStr,
        hoursWorked: 0,
        isWorkingDay: false,
        isHoliday: isHolidayDay,
      });
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      const start = parseTime(config.workingHours.start);
      setTimeInTimeZone(currentDate, start.hours, start.minutes, config.timezone);
      continue;
    }
    
    // Calculate available hours for this day
    const remainingToday = getRemainingBusinessHoursToday(currentDate, config);
    const hoursToUse = Math.min(remainingHours, remainingToday);
    
    if (hoursToUse > 0) {
      breakdown.push({
        date: dateStr,
        hoursWorked: hoursToUse,
        isWorkingDay: true,
        isHoliday: false,
      });
      
      remainingHours -= hoursToUse;
      
      if (remainingHours <= 0) {
        // SLA deadline reached
        const minutesToAdd = hoursToUse * 60;
        currentDate.setUTCMinutes(currentDate.getUTCMinutes() + minutesToAdd);
        break;
      }
    }
    
    // Move to next day
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    const start = parseTime(config.workingHours.start);
    setTimeInTimeZone(currentDate, start.hours, start.minutes, config.timezone);
  }
  
  // Calculate calendar hours elapsed
  const calendarHoursUsed = (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  
  return {
    deadline: currentDate,
    businessHoursUsed: slaHours,
    calendarHoursUsed: Math.round(calendarHoursUsed * 100) / 100,
    breakdown,
  };
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
};

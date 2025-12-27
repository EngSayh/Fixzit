// date-fns imports removed - using native UTC Date methods for timezone-independent SLA calculations

export type WorkOrderPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const SLA_MINUTES_MAP: Record<WorkOrderPriority, number> = {
  LOW: 72 * 60, // 3 days
  MEDIUM: 36 * 60, // 1.5 days
  HIGH: 12 * 60, // 12 hours
  CRITICAL: 4 * 60, // 4 hours
};

/**
 * Business hours configuration (Saudi Arabia)
 * Sunday-Thursday: 08:00-17:00 (9 hours/day)
 * Friday-Saturday: Off
 */
export interface BusinessHoursConfig {
  startHour: number;
  endHour: number;
  workDays: number[]; // 0=Sunday, 1=Monday, ... 6=Saturday
}

export const DEFAULT_BUSINESS_HOURS: BusinessHoursConfig = {
  startHour: 8,
  endHour: 17,
  workDays: [0, 1, 2, 3, 4], // Sunday-Thursday (Saudi work week)
};

// UTC-safe date helpers for timezone-independent SLA calculations
function getUTCDay(date: Date): number {
  return date.getUTCDay();
}

function getUTCHours(date: Date): number {
  return date.getUTCHours();
}

function getUTCMinutes(date: Date): number {
  return date.getUTCMinutes();
}

function setUTCHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setUTCHours(hours);
  return result;
}

function setUTCMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setUTCMinutes(minutes);
  return result;
}

function addUTCDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function addUTCMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

/**
 * Returns the SLA resolution window in minutes for a work order priority.
 * This function is used server side when persisting records and in
 * verification scripts that seed the real Mongo database.
 */
export function computeSlaMinutes(priority: WorkOrderPriority): number {
  return SLA_MINUTES_MAP[priority] ?? SLA_MINUTES_MAP.MEDIUM;
}

/**
 * Checks if a given date/time falls within business hours (UTC-based)
 */
export function isBusinessHour(
  date: Date,
  config: BusinessHoursConfig = DEFAULT_BUSINESS_HOURS
): boolean {
  const dayOfWeek = getUTCDay(date);
  const hour = getUTCHours(date);
  
  if (!config.workDays.includes(dayOfWeek)) return false;
  if (hour < config.startHour || hour >= config.endHour) return false;
  
  return true;
}

/**
 * Gets the next business hour start from a given date (UTC-based)
 */
export function getNextBusinessHourStart(
  date: Date,
  config: BusinessHoursConfig = DEFAULT_BUSINESS_HOURS
): Date {
  let current = new Date(date);
  
  // If already in business hours, return as-is
  if (isBusinessHour(current, config)) {
    return current;
  }
  
  // Find the next work day
  let daysChecked = 0;
  while (daysChecked < 7) {
    const dayOfWeek = getUTCDay(current);
    const hour = getUTCHours(current);
    
    if (config.workDays.includes(dayOfWeek)) {
      // It's a work day
      if (hour < config.startHour) {
        // Before start - jump to start
        return setUTCMinutes(setUTCHours(current, config.startHour), 0);
      } else if (hour >= config.endHour) {
        // After end - go to next day
        current = addUTCDays(current, 1);
        current = setUTCMinutes(setUTCHours(current, config.startHour), 0);
      } else {
        // Within hours
        return current;
      }
    } else {
      // Not a work day - go to next day at start hour
      current = addUTCDays(current, 1);
      current = setUTCMinutes(setUTCHours(current, config.startHour), 0);
    }
    daysChecked++;
  }
  
  // Fallback (shouldn't happen with valid config)
  return setUTCMinutes(setUTCHours(addUTCDays(date, 1), config.startHour), 0);
}

/**
 * Calculates the due date for a work order by adding the SLA window to
 * the provided start time. A new Date instance is always returned.
 * 
 * @deprecated Use computeDueAtBusinessHours for business-hours-aware calculation
 */
export function computeDueAt(start: Date, slaMinutes: number): Date {
  return addUTCMinutes(start, slaMinutes);
}

/**
 * Calculates the due date accounting for business hours (UTC-based).
 * Example: 4-hour SLA created Friday 4pm → Due Monday 12pm (skips weekend)
 */
export function computeDueAtBusinessHours(
  start: Date,
  slaMinutes: number,
  config: BusinessHoursConfig = DEFAULT_BUSINESS_HOURS
): Date {
  const minutesPerDay = (config.endHour - config.startHour) * 60;
  let remainingMinutes = slaMinutes;
  let current = getNextBusinessHourStart(start, config);
  
  while (remainingMinutes > 0) {
    const hour = getUTCHours(current);
    const minute = getUTCMinutes(current);
    const currentMinuteOfDay = (hour - config.startHour) * 60 + minute;
    const remainingTodayMinutes = minutesPerDay - currentMinuteOfDay;
    
    if (remainingMinutes <= remainingTodayMinutes) {
      // Fits within today
      return addUTCMinutes(current, remainingMinutes);
    }
    
    // Consume today's remaining time and move to next business day
    remainingMinutes -= remainingTodayMinutes;
    current = addUTCDays(current, 1);
    current = setUTCMinutes(setUTCHours(current, config.startHour), 0);
    current = getNextBusinessHourStart(current, config);
  }
  
  return current;
}

/**
 * Convenience helper that returns both the SLA window (minutes) and the
 * computed due date for a work order priority. This keeps controller logic
 * concise and guarantees consistent calculations across the app and QA
 * tooling.
 * 
 * @param useBusinessHours - If true, calculates using business hours calendar
 */
export function resolveSlaTarget(
  priority: WorkOrderPriority,
  start: Date = new Date(),
  useBusinessHours: boolean = false,
  config: BusinessHoursConfig = DEFAULT_BUSINESS_HOURS
) {
  const slaMinutes = computeSlaMinutes(priority);
  const dueAt = useBusinessHours
    ? computeDueAtBusinessHours(start, slaMinutes, config)
    : computeDueAt(start, slaMinutes);
  
  return {
    slaMinutes,
    dueAt,
    useBusinessHours,
  };
}

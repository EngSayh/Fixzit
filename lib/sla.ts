import { addMinutes, addDays, setHours, setMinutes, getDay, startOfDay } from "date-fns";

export type WorkOrderPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const SLA_MINUTES_MAP: Record<WorkOrderPriority, number> = {
  LOW: 72 * 60, // 3 days
  MEDIUM: 36 * 60, // 1.5 days
  HIGH: 12 * 60, // 12 hours
  CRITICAL: 4 * 60, // 4 hours
};

/**
 * Business hours configuration for SLA calculation
 * Default: Saudi Arabia work week (Sunday-Thursday, 8:00-18:00)
 */
export interface BusinessHoursConfig {
  /** Work week start day (0 = Sunday, 1 = Monday, etc.) */
  workWeekStart: number;
  /** Work week end day */
  workWeekEnd: number;
  /** Daily start hour (0-23) */
  startHour: number;
  /** Daily end hour (0-23) */
  endHour: number;
  /** Public holidays (ISO date strings: YYYY-MM-DD) */
  holidays?: string[];
}

/** Default Saudi Arabia business hours */
export const DEFAULT_BUSINESS_HOURS: BusinessHoursConfig = {
  workWeekStart: 0, // Sunday
  workWeekEnd: 4, // Thursday
  startHour: 8,
  endHour: 18,
  holidays: [],
};

/**
 * Check if a given date/time falls within business hours
 */
export function isBusinessHours(
  date: Date,
  config: BusinessHoursConfig = DEFAULT_BUSINESS_HOURS
): boolean {
  const dayOfWeek = getDay(date);
  const hour = date.getHours();
  
  // Check if it's a working day
  const isWorkingDay = dayOfWeek >= config.workWeekStart && dayOfWeek <= config.workWeekEnd;
  if (!isWorkingDay) return false;
  
  // Check if it's a holiday
  const dateStr = date.toISOString().split('T')[0];
  if (config.holidays?.includes(dateStr)) return false;
  
  // Check if within working hours
  return hour >= config.startHour && hour < config.endHour;
}

/**
 * Get the next business day start
 */
export function getNextBusinessDayStart(
  from: Date,
  config: BusinessHoursConfig = DEFAULT_BUSINESS_HOURS
): Date {
  let current = new Date(from);
  
  // If we're past end of day, move to next day
  if (current.getHours() >= config.endHour) {
    current = addDays(current, 1);
  }
  
  // Set to start of business hours
  current = setHours(setMinutes(startOfDay(current), 0), config.startHour);
  
  // Find next working day
  let attempts = 0;
  while (attempts < 10) { // Safety limit
    const dayOfWeek = getDay(current);
    const dateStr = current.toISOString().split('T')[0];
    
    const isWorkingDay = dayOfWeek >= config.workWeekStart && dayOfWeek <= config.workWeekEnd;
    const isHoliday = config.holidays?.includes(dateStr);
    
    if (isWorkingDay && !isHoliday) {
      return current;
    }
    
    current = addDays(current, 1);
    current = setHours(setMinutes(startOfDay(current), 0), config.startHour);
    attempts++;
  }
  
  return current;
}

/**
 * Calculate SLA deadline considering business hours only
 * 
 * Example: 4-hour SLA created Friday 4pm (Saudi)
 * - Friday is a weekend day, so start Sunday 8am
 * - Sunday 8am + 4 hours = Sunday 12pm
 * 
 * @param start - When the work order was created
 * @param slaMinutes - SLA window in minutes
 * @param config - Business hours configuration
 * @returns The SLA deadline (adjusted for business hours)
 */
export function computeDueAtBusinessHours(
  start: Date,
  slaMinutes: number,
  config: BusinessHoursConfig = DEFAULT_BUSINESS_HOURS
): Date {
  const hoursPerDay = config.endHour - config.startHour;
  const minutesPerDay = hoursPerDay * 60;
  
  let remainingMinutes = slaMinutes;
  let current = new Date(start);
  
  // If starting outside business hours, move to next business day start
  if (!isBusinessHours(current, config)) {
    current = getNextBusinessDayStart(current, config);
  } else {
    // If we're in business hours but it's too late to fit remaining time today
    const todayEnd = setHours(setMinutes(startOfDay(current), 0), config.endHour);
    const minutesRemainingToday = Math.max(0, (todayEnd.getTime() - current.getTime()) / 60000);
    
    if (minutesRemainingToday >= remainingMinutes) {
      // Can complete within today's business hours
      return addMinutes(current, remainingMinutes);
    }
    
    // Use up remaining today, continue tomorrow
    remainingMinutes -= minutesRemainingToday;
    current = getNextBusinessDayStart(addDays(current, 1), config);
  }
  
  // Process full business days
  while (remainingMinutes > minutesPerDay) {
    remainingMinutes -= minutesPerDay;
    current = getNextBusinessDayStart(addDays(current, 1), config);
  }
  
  // Add remaining minutes within the final day
  return addMinutes(current, remainingMinutes);
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
 * Calculates the due date for a work order by adding the SLA window to
 * the provided start time. A new Date instance is always returned.
 * 
 * @deprecated Use resolveSlaTarget with useBusinessHours: true for accurate deadlines
 */
export function computeDueAt(start: Date, slaMinutes: number): Date {
  return addMinutes(start, slaMinutes);
}

/**
 * Convenience helper that returns both the SLA window (minutes) and the
 * computed due date for a work order priority. This keeps controller logic
 * concise and guarantees consistent calculations across the app and QA
 * tooling.
 * 
 * @param priority - Work order priority level
 * @param start - When the work order was created (default: now)
 * @param options - Optional configuration
 * @param options.useBusinessHours - If true, calculate deadline using business hours only
 * @param options.businessHoursConfig - Custom business hours (default: Saudi work week)
 */
export function resolveSlaTarget(
  priority: WorkOrderPriority,
  start: Date = new Date(),
  options?: {
    useBusinessHours?: boolean;
    businessHoursConfig?: BusinessHoursConfig;
  }
) {
  const slaMinutes = computeSlaMinutes(priority);
  const { useBusinessHours = false, businessHoursConfig = DEFAULT_BUSINESS_HOURS } = options || {};
  
  const dueAt = useBusinessHours
    ? computeDueAtBusinessHours(start, slaMinutes, businessHoursConfig)
    : computeDueAt(start, slaMinutes);
  
  return {
    slaMinutes,
    dueAt,
    usedBusinessHours: useBusinessHours,
  };
}

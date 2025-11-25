/**
 * Timestamp handling utilities for marketplace and system operations
 */

/**
 * Validate and sanitize timestamp values
 */
export function validateTimestamp(value: unknown): Date | null {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return null;
  }

  // Handle Date objects
  if (value instanceof Date) {
    return isValidDate(value) ? value : null;
  }

  // Handle numbers (Unix timestamps)
  if (typeof value === "number") {
    // Handle createdAt=0 edge case
    if (value === 0) {
      return null;
    }

    // Handle both seconds and milliseconds timestamps
    const timestamp = value < 1e10 ? value * 1000 : value;
    const date = new Date(timestamp);
    return isValidDate(date) ? date : null;
  }

  // Handle strings
  if (typeof value === "string") {
    // Handle empty strings
    if (value.trim() === "") {
      return null;
    }

    const date = new Date(value);
    return isValidDate(date) ? date : null;
  }

  return null;
}

/**
 * Check if a Date object is valid
 */
export function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Create a safe timestamp object with validation
 */
export function createSafeTimestamp(value?: unknown): Date {
  const validated = validateTimestamp(value);
  return validated || new Date();
}

/**
 * Sanitize timestamp fields in an object
 */
export function sanitizeTimestamps<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[] = ["createdAt", "updatedAt"],
): T {
  const sanitized = { ...obj };

  for (const field of fields) {
    if (field in sanitized) {
      const validated = validateTimestamp(sanitized[field]);
      sanitized[field] = (validated || new Date()) as T[keyof T];
    }
  }

  return sanitized;
}

/**
 * Validate array of objects and sanitize their timestamps
 */
export function validateCollection<T extends Record<string, unknown>>(
  collection: T[],
  timestampFields: (keyof T)[] = ["createdAt", "updatedAt"],
): T[] {
  if (!Array.isArray(collection)) {
    throw new Error("Collection must be an array");
  }

  return collection.map((item) => sanitizeTimestamps(item, timestampFields));
}

/**
 * Add default timestamps to an object
 */
export function addTimestamps<T extends Record<string, unknown>>(
  obj: T,
  overwrite: boolean = false,
): T & { createdAt: Date; updatedAt: Date } {
  const now = new Date();

  return {
    ...obj,
    createdAt:
      !obj.createdAt || overwrite ? now : createSafeTimestamp(obj.createdAt),
    updatedAt: now,
  };
}

/**
 * Update only the updatedAt timestamp
 */
export function updateTimestamp<T extends Record<string, unknown>>(
  obj: T,
): T & { updatedAt: Date } {
  return {
    ...obj,
    updatedAt: new Date(),
  };
}

/**
 * Format timestamp for different locales
 * CRITICAL: locale is required - no default to force i18n-aware usage
 */
export function formatTimestamp(
  timestamp: Date | string | number,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = createSafeTimestamp(timestamp);

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  };

  return date.toLocaleString(locale, defaultOptions);
}

/**
 * Get relative time string (e.g., "2 hours ago")
 * CRITICAL: locale is required - no default to force i18n-aware usage
 */
export function getRelativeTime(
  timestamp: Date | string | number,
  locale: string,
): string {
  const date = createSafeTimestamp(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  const intervals = [
    { unit: "year", ms: 365 * 24 * 60 * 60 * 1000 },
    { unit: "month", ms: 30 * 24 * 60 * 60 * 1000 },
    { unit: "week", ms: 7 * 24 * 60 * 60 * 1000 },
    { unit: "day", ms: 24 * 60 * 60 * 1000 },
    { unit: "hour", ms: 60 * 60 * 1000 },
    { unit: "minute", ms: 60 * 1000 },
  ];

  for (const interval of intervals) {
    const value = Math.floor(diff / interval.ms);
    if (Math.abs(value) >= 1) {
      return rtf.format(-value, interval.unit as Intl.RelativeTimeFormatUnit);
    }
  }

  return rtf.format(0, "second");
}

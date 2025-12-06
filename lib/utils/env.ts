/**
 * Truthy env helper used to normalize boolean flags across runtimes.
 * Treats "true" and "1" (string) as truthy; everything else is false.
 */
export const isTruthy = (value?: string): boolean =>
  value === "true" || value === "1";

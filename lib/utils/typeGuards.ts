/**
 * Type guard utilities for runtime type checking
 * Use these to safely handle unknown types, especially in catch blocks
 */

/**
 * Type guard to check if an unknown value is an Error instance
 * @param error - The value to check
 * @returns true if the value is an Error instance
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Safely extract an error message from an unknown error value
 * Handles Error instances, strings, and provides a default message
 * @param error - The error value (unknown type from catch block)
 * @returns A string error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unexpected error occurred";
}

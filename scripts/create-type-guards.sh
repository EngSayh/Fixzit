#!/bin/bash
set -e

# Script to create type guard utilities for error handling
# This ensures lib/utils/typeGuards.ts exists with proper error handling utilities

TARGET_FILE="lib/utils/typeGuards.ts"

echo "Creating type guard utilities at ${TARGET_FILE}..."

# Create directory if it doesn't exist
mkdir -p "$(dirname "${TARGET_FILE}")"

# Write the type guard utilities
cat > "${TARGET_FILE}" << 'EOF'
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
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}
EOF

echo "✅ Type guard utilities created at ${TARGET_FILE}"
echo ""
echo "Usage hint:"
echo "  import { getErrorMessage } from '@/lib/utils/typeGuards';"
echo ""
echo "Example in catch block:"
echo "  catch (error: unknown) {"
echo "    const message = getErrorMessage(error);"
echo "    return createSecureResponse({ error: message }, 500, req);"
echo "  }"

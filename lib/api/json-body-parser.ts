/**
 * @fileoverview Safe JSON body parser for Next.js API routes
 *
 * Provides error handling wrapper around req.json() to prevent 500 errors
 * from malformed JSON payloads. Returns 400 Bad Request with clear error message.
 *
 * @usage
 * ```typescript
 * // Before (unsafe)
 * const body = await req.json();
 *
 * // After (safe)
 * const body = await safeJsonParse(req);
 * ```
 *
 * @see {@link https://nextjs.org/docs/app/api-reference/functions/next-request}
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Safely parse JSON body from Next.js request with error handling
 *
 * @param {NextRequest} req - Next.js request object
 * @param {object} [options] - Parsing options
 * @param {string} [options.errorMessage] - Custom error message for 400 response
 * @param {boolean} [options.nullable] - Allow empty/null bodies (default: false)
 *
 * @returns {Promise<T>} Parsed JSON body
 * @throws {NextResponse} 400 Bad Request if JSON is malformed or empty (when nullable=false)
 *
 * @example
 * // Basic usage
 * export async function POST(req: NextRequest) {
 *   const body = await safeJsonParse<{ name: string }>(req);
 *   // ...
 * }
 *
 * @example
 * // Custom error message
 * const body = await safeJsonParse(req, {
 *   errorMessage: 'Invalid product data format'
 * });
 *
 * @example
 * // Allow nullable/empty bodies
 * const body = await safeJsonParse(req, { nullable: true });
 *
 * @security
 * - Prevents 500 errors from malformed JSON (defense against fuzzing attacks)
 * - Returns clear 400 error messages (no stack traces leaked)
 */
export async function safeJsonParse<T = unknown>(
  req: NextRequest,
  options?: {
    errorMessage?: string;
    nullable?: boolean;
  }
): Promise<T> {
  try {
    const body = await req.json();
    
    // Check for empty/null bodies if not explicitly allowed
    if (!options?.nullable && (body === null || body === undefined)) {
      throw new Error('Request body is empty');
    }
    
    return body as T;
  } catch (error) {
    const message = options?.errorMessage || 'Invalid JSON in request body';
    
    // Return 400 Bad Request (not 500)
    throw NextResponse.json(
      {
        error: message,
        details: error instanceof Error ? error.message : 'Malformed JSON',
      },
      { status: 400 }
    );
  }
}

/**
 * Type guard to check if response is NextResponse error
 * @param {unknown} value - Value to check
 * @returns {boolean} True if value is NextResponse
 */
export function isNextResponseError(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

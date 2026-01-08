/**
 * @fileoverview Semantic status code assertions for API tests
 * Enforces consistent expectations and better error messages
 */

import { expect } from 'vitest';

/**
 * Expect authentication failure (401/403/429)
 * Use when testing unauthenticated or unauthorized requests
 * Note: 429 included as rate limiting may trigger before auth in some routes
 */
export function expectAuthFailure(response: Response, message?: string): void {
  const validStatuses = [401, 403, 429];
  expect(
    validStatuses,
    message || `Expected auth failure (401/403/429) but got ${response.status}`
  ).toContain(response.status);
}

/**
 * Expect validation failure (400/422)
 * Use when testing invalid input
 */
export function expectValidationFailure(response: Response, message?: string): void {
  const validStatuses = [400, 422];
  expect(
    validStatuses,
    message || `Expected validation failure (400/422) but got ${response.status}`
  ).toContain(response.status);
}

/**
 * Expect rate limiting (429)
 * Use when testing rate limit enforcement
 */
export function expectRateLimited(response: Response, message?: string): void {
  expect(
    response.status,
    message || `Expected rate limited (429) but got ${response.status}`
  ).toBe(429);
}

/**
 * Expect success (200/201/204)
 * Use for successful operations
 */
export function expectSuccess(response: Response, message?: string): void {
  const validStatuses = [200, 201, 204];
  expect(
    validStatuses,
    message || `Expected success (200/201/204) but got ${response.status}`
  ).toContain(response.status);
}

/**
 * Expect not found (404)
 */
export function expectNotFound(response: Response, message?: string): void {
  expect(
    response.status,
    message || `Expected not found (404) but got ${response.status}`
  ).toBe(404);
}

/**
 * ONLY use for explicit dependency-down/offline tests
 * NOT for normal auth or validation tests
 */
export function expectServiceUnavailable(response: Response, message?: string): void {
  const validStatuses = [500, 502, 503];
  expect(
    validStatuses,
    message || `Expected service unavailable (500/502/503) but got ${response.status}`
  ).toContain(response.status);
}

/**
 * ONLY use for explicit feature flag disabled tests
 * Tests for endpoints that intentionally return 501 (e.g., deprecated features)
 */
export function expect501Deprecated(response: Response, message?: string): void {
  expect(
    response.status,
    message || `Expected 501 (deprecated endpoint) but got ${response.status}`
  ).toBe(501);
}

/**
 * Flexible status check - use sparingly with justification
 * @param statuses Array of acceptable status codes
 * @param reason Explanation for why multiple statuses are acceptable
 */
export function expectOneOf(
  response: Response, 
  statuses: number[], 
  reason: string
): void {
  expect(
    statuses,
    `Expected one of [${statuses.join(', ')}] (${reason}) but got ${response.status}`
  ).toContain(response.status);
}

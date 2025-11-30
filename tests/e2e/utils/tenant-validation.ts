/**
 * Shared Tenant Validation Utilities for E2E Tests
 * 
 * AUDIT-2025-12-01: Extracted from subrole-api-access.spec.ts to ensure
 * consistent validation depth across all E2E suites.
 * 
 * This module provides recursive org_id validation that handles:
 * - Direct objects: { org_id: "..." }
 * - Arrays: [{ org_id: "..." }, ...]
 * - Wrapped payloads: { data: [...] }, { items: [...] }, { results: [...] }
 * - Nested structures: { summary: { org_id: "..." }, rows: [...] }
 * - Both snake_case (org_id) and camelCase (orgId) variants
 */

import { expect } from '@playwright/test';

/**
 * Options for walkAndVerifyOrgId
 */
export interface WalkOrgIdOptions {
  /** The expected org_id value (from TEST_ORG_ID) */
  expectedOrgId: string;
  /** Endpoint path for error messages */
  endpoint: string;
  /** Role or context for error messages (optional) */
  context?: string;
  /** Whether to require org_id presence on leaf objects (default: false for health checks) */
  requirePresence?: boolean;
}

/**
 * Keys that are pure metadata and never contain tenant-scoped business data.
 * Skipped during recursive traversal to avoid false positives.
 */
const METADATA_ONLY_KEYS = new Set(['meta', 'pagination', '_metadata', '__v', 'count', 'total', 'page', 'limit']);

/**
 * Recursively walks a response body and verifies all org_id/orgId fields match expected tenant.
 * 
 * This is the gold-standard pattern for tenant validation in E2E tests:
 * - Handles any API response shape (direct, array, wrapped, nested)
 * - Supports both org_id and orgId variants
 * - Provides detailed error messages with JSON path for debugging
 * 
 * @example
 * ```ts
 * const body = await response.json();
 * walkAndVerifyOrgId(body, {
 *   expectedOrgId: TEST_ORG_ID,
 *   endpoint: '/api/work-orders',
 *   context: 'health check'
 * });
 * ```
 */
export function walkAndVerifyOrgId(
  value: unknown,
  options: WalkOrgIdOptions,
  path = 'body'
): void {
  if (!value || typeof value !== 'object') return;

  // Handle arrays - verify each item
  if (Array.isArray(value)) {
    value.forEach((item, idx) => walkAndVerifyOrgId(item, options, `${path}[${idx}]`));
    return;
  }

  const v = value as Record<string, unknown>;
  const { expectedOrgId, endpoint, context, requirePresence = false } = options;

  // Check both org_id and orgId - Mongoose uses camelCase, some APIs use snake_case
  const foundOrgId = v.org_id ?? v.orgId;

  // Optionally enforce org_id presence (fail-closed pattern)
  if (requirePresence && foundOrgId === undefined) {
    // Before failing, check if this is a wrapper object (no org_id expected at wrapper level)
    const isWrapperOnly = ['data', 'items', 'results', 'meta', 'pagination'].some(
      key => key in v && !('org_id' in v) && !('orgId' in v)
    );

    if (!isWrapperOnly) {
      expect(
        false,
        `TENANT ID MISSING: ${endpoint} at ${path} has no org_id or orgId field.\n` +
        `Context: ${context || 'unknown'}\n` +
        `Expected: org_id or orgId field with value ${expectedOrgId}\n\n` +
        `SECURITY RISK: APIs that omit tenant identifiers can leak cross-tenant data.\n` +
        `ACTION:\n` +
        `  • If this endpoint SHOULD return tenant-scoped data: Fix backend to include org_id\n` +
        `  • If this endpoint is tenant-agnostic by design: Set requirePresence: false`
      ).toBe(true);
    }
  }

  // Verify org_id value when present
  if (foundOrgId !== undefined) {
    expect(
      String(foundOrgId),
      `TENANT MISMATCH at ${path}: Expected org_id/orgId=${expectedOrgId}, got ${foundOrgId}\n` +
      `Endpoint: ${endpoint}\n` +
      `Context: ${context || 'unknown'}\n\n` +
      `SECURITY RISK: Cross-tenant data leak detected!`
    ).toBe(expectedOrgId);
  }

  // Recurse into ALL nested objects to catch tenant leaks
  // regardless of the key name (summary, payload, user, rows, etc.)
  for (const [key, val] of Object.entries(v)) {
    // Skip non-objects and metadata-only keys
    if (!val || typeof val !== 'object') continue;
    if (METADATA_ONLY_KEYS.has(key)) continue;

    // Recurse into this nested object/array
    walkAndVerifyOrgId(val, options, `${path}.${key}`);
  }
}

/**
 * Simplified wrapper for health check tests where you just want to verify
 * any org_id fields match the expected tenant (without requiring presence).
 * 
 * @example
 * ```ts
 * if (response.status() === 200 && TEST_ORG_ID) {
 *   const body = await response.json();
 *   verifyTenantScoping(body, TEST_ORG_ID, '/api/work-orders');
 * }
 * ```
 */
export function verifyTenantScoping(
  body: unknown,
  expectedOrgId: string,
  endpoint: string,
  context?: string
): void {
  walkAndVerifyOrgId(body, {
    expectedOrgId,
    endpoint,
    context,
    requirePresence: false,
  });
}

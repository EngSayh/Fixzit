import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";
import { FMErrors, fmErrorContext } from "../errors";
import { logger } from "@/lib/logger";

type TenantResolutionSuccess = {
  tenantId: string;
  source: "header" | "query" | "session";
};

export type TenantResolutionResult =
  | TenantResolutionSuccess
  | { error: NextResponse };

// PHASE-2 FIX: Options for Super Admin-aware tenant resolution
export interface TenantResolutionOptions {
  isSuperAdmin?: boolean;
  userId?: string;
  allowHeaderOverride?: boolean; // Only true for Super Admin with explicit assumption
}

// Constants for cross-tenant marker
export const CROSS_TENANT_MARKER = '__CROSS_TENANT__' as const;

/**
 * Type guard to check if resolved tenantId is the cross-tenant marker
 * Used by Super Admins for platform-wide queries
 */
export function isCrossTenantMode(tenantId: string): tenantId is typeof CROSS_TENANT_MARKER {
  return tenantId === CROSS_TENANT_MARKER;
}

/**
 * Build a tenant-scoped query filter.
 * For Super Admins in cross-tenant mode, returns empty object (no org filter).
 * For regular users, returns { orgId: tenantId } filter.
 * 
 * @param tenantId - The resolved tenant ID or CROSS_TENANT_MARKER
 * @param fieldName - The field name to use (default: 'orgId', some collections use 'org_id')
 */
export function buildTenantFilter(
  tenantId: string,
  fieldName: 'orgId' | 'org_id' = 'orgId'
): Record<string, string> {
  if (isCrossTenantMode(tenantId)) {
    // Super Admin cross-tenant mode - no org filter
    return {};
  }
  return { [fieldName]: tenantId };
}

const TENANT_HEADER_CANDIDATES = [
  "x-tenant-id",
  "x-org-id",
  "x-organization-id",
  "x-customer-id",
  "x-support-org-id",
] as const;

const normalizeTenantValue = (
  value: string | null | undefined,
): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

/**
 * Resolves the active tenant/org context for FM endpoints from headers, query params, or the session.
 * Guards against conflicts by returning a standardized FM error response when mismatched values are supplied.
 * 
 * PHASE-2 FIX: Hardened against header spoofing attacks
 * - Non-Super Admin: Header override REJECTED if session has orgId
 * - Super Admin: Header override ALLOWED only with explicit audit logging
 */
export function resolveTenantId(
  req: NextRequest,
  fallbackTenantId?: string | null,
  options?: TenantResolutionOptions,
): TenantResolutionResult {
  const headerTenant =
    TENANT_HEADER_CANDIDATES.map((header) =>
      normalizeTenantValue(req.headers.get(header)),
    ).find(Boolean) ?? null;
  const queryTenant = normalizeTenantValue(
    req.nextUrl?.searchParams?.get("tenantId"),
  );
  const sessionTenant = normalizeTenantValue(
    typeof fallbackTenantId === "string"
      ? fallbackTenantId
      : (fallbackTenantId ?? null),
  );

  // PHASE-2 FIX: Reject header override for authenticated non-Super Admin users
  // This prevents header spoofing attacks where users inject x-org-id headers
  if (headerTenant && sessionTenant && headerTenant !== sessionTenant) {
    if (!options?.isSuperAdmin || !options?.allowHeaderOverride) {
      logger.warn('tenant_header_spoofing_blocked', {
        action: 'reject_header_override',
        headerOrg: headerTenant,
        sessionOrg: sessionTenant,
        userId: options?.userId,
        isSuperAdmin: options?.isSuperAdmin ?? false,
        path: req.nextUrl.pathname,
        timestamp: new Date().toISOString(),
      });
      return {
        error: FMErrors.forbidden(
          "Tenant context mismatch: header override not permitted",
          fmErrorContext(req),
        ),
      };
    }
    
    // Super Admin with explicit header override - AUDIT
    logger.info('superadmin_header_override', {
      action: 'allow_header_override',
      userId: options?.userId,
      sessionOrg: sessionTenant,
      assumedOrg: headerTenant,
      path: req.nextUrl.pathname,
      timestamp: new Date().toISOString(),
    });
  }

  const conflictPairs: Array<[string | null, string | null]> = [
    [headerTenant, queryTenant],
    [queryTenant, sessionTenant],
  ];

  for (const [first, second] of conflictPairs) {
    if (first && second && first !== second) {
      return {
        error: FMErrors.forbidden(
          "Tenant context mismatch detected",
          fmErrorContext(req),
        ),
      };
    }
  }

  // PHASE-2 FIX: For Super Admin without orgId, allow null tenantId (cross-tenant mode)
  // For regular users, require tenantId
  const tenantId = headerTenant ?? queryTenant ?? sessionTenant;
  if (!tenantId) {
    if (options?.isSuperAdmin) {
      // Super Admin cross-tenant access - return special marker
      // AUDIT FIX: Use explicit marker instead of empty string to prevent silent failures
      // Caller must handle cross-tenant queries explicitly and decide how to scope
      logger.info('superadmin_cross_tenant_mode', {
        action: 'enter_cross_tenant',
        userId: options?.userId,
        path: req.nextUrl.pathname,
        timestamp: new Date().toISOString(),
      });
      return {
        tenantId: '__CROSS_TENANT__', // Explicit marker instead of empty string
        source: 'session',
      };
    }
    return { error: FMErrors.missingTenant(fmErrorContext(req)) };
  }

  return {
    tenantId,
    source: headerTenant ? "header" : queryTenant ? "query" : "session",
  };
}

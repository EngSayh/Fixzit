import type { NextRequest } from 'next/server';
import type { NextResponse } from 'next/server';
import { FMErrors, fmErrorContext } from '../errors';

type TenantResolutionSuccess = {
  tenantId: string;
  source: 'header' | 'query' | 'session';
};

export type TenantResolutionResult =
  | TenantResolutionSuccess
  | { error: NextResponse };

const TENANT_HEADER_CANDIDATES = [
  'x-tenant-id',
  'x-org-id',
  'x-organization-id',
  'x-customer-id',
  'x-support-org-id',
] as const;

const normalizeTenantValue = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

/**
 * Resolves the active tenant/org context for FM endpoints from headers, query params, or the session.
 * Guards against conflicts by returning a standardized FM error response when mismatched values are supplied.
 */
export function resolveTenantId(
  req: NextRequest,
  fallbackTenantId?: string | null
): TenantResolutionResult {
  const headerTenant =
    TENANT_HEADER_CANDIDATES.map((header) => normalizeTenantValue(req.headers.get(header))).find(Boolean) ??
    null;
  const queryTenant = normalizeTenantValue(req.nextUrl?.searchParams?.get('tenantId'));
  const sessionTenant = normalizeTenantValue(
    typeof fallbackTenantId === 'string' ? fallbackTenantId : fallbackTenantId ?? null
  );

  const conflictPairs: Array<[string | null, string | null]> = [
    [headerTenant, queryTenant],
    [headerTenant, sessionTenant],
    [queryTenant, sessionTenant],
  ];

  for (const [first, second] of conflictPairs) {
    if (first && second && first !== second) {
      return { error: FMErrors.forbidden('Tenant context mismatch detected', fmErrorContext(req)) };
    }
  }

  const tenantId = headerTenant ?? queryTenant ?? sessionTenant;
  if (!tenantId) {
    return { error: FMErrors.missingTenant(fmErrorContext(req)) };
  }

  return {
    tenantId,
    source: headerTenant ? 'header' : queryTenant ? 'query' : 'session',
  };
}

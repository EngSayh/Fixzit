// @ts-nocheck
import { verifyToken } from '@/src/lib/auth';

export type AuthContext = { tenantId: string | null; role: string | null };

export function getAuthFromRequest(req: any): AuthContext {
  try {
    const token = req?.cookies?.get?.('fixzit_auth')?.value || req?.headers?.get?.('x-auth-token');
    if (!token) return { tenantId: null, role: null };
    const payload = verifyToken(token);
    return { tenantId: payload?.tenantId || null, role: payload?.role || null };
  } catch {
    return { tenantId: null, role: null };
  }
}

export function requireMarketplaceReadRole(role: string | null): boolean {
  if (!role) return false;
  const allowed = new Set([
    'SUPER_ADMIN', 'ADMIN', 'TENANT_ADMIN', 'PROPERTY_MANAGER', 'EMPLOYEE', 'TECHNICIAN', 'TENANT', 'VENDOR', 'CUSTOMER'
  ]);
  return allowed.has(role);
}


import { verifyToken } from '@/src/lib/auth';

export type AuthContext = { tenantId: string | null; role: string | null };

type RequestLike = {
  cookies?: { get?: (name: string) => { value?: string } | undefined };
  headers?: { get?: (name: string) => string | undefined };
};

type TokenPayload = { tenantId?: string; role?: string } | null | undefined;

export function getAuthFromRequest(req: RequestLike): AuthContext {
  try {
    const token = req?.cookies?.get?.('fixzit_auth')?.value || req?.headers?.get?.('x-auth-token');
    if (!token) return { tenantId: null, role: null };
    const payload = verifyToken(token) as TokenPayload;
    return { tenantId: payload?.tenantId ?? null, role: payload?.role ?? null };
  } catch {
    return { tenantId: null, role: null };
  }
}

export function requireMarketplaceReadRole(role: string | null): boolean {
  if (!role) return false;
  // Drive from canonical governance matrix where marketplace access is defined
  const allowed = new Set([
    'SUPER_ADMIN', 'ADMIN', 'CORPORATE_ADMIN', 'FM_MANAGER', 'FINANCE', 'HR', 'PROCUREMENT',
    'PROPERTY_MANAGER', 'EMPLOYEE', 'TECHNICIAN', 'VENDOR', 'CUSTOMER', 'OWNER', 'AUDITOR'
  ]);
  return allowed.has(role);
}


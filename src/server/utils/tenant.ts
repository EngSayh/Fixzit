// @ts-nocheck
import { verifyToken } from '@/src/lib/auth';

export function getTenantFromRequest(req: any): string | null {
  try {
    const token = req?.cookies?.get?.('fixzit_auth')?.value || req?.headers?.get?.('x-auth-token');
    if (!token) return null;
    const payload = verifyToken(token);
    return payload?.tenantId || null;
  } catch {
    return null;
  }
}


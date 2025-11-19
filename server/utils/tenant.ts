import { verifyToken } from '@/lib/auth';
import { Role, ROLE_MODULE_ACCESS, ModuleKey } from '@/domain/fm/fm.behavior';

export type AuthContext = { orgId: string | null; role: string | null };

type RequestLike = {
  cookies?: { get?: (name: string) => { value?: string } | undefined };
  headers?: { get?: (name: string) => string | undefined };
};

type TokenPayload = { orgId?: string; role?: string } | null | undefined;

export async function getAuthFromRequest(req: RequestLike): Promise<AuthContext> {
  try {
    const token = req?.cookies?.get?.('fixzit_auth')?.value || req?.headers?.get?.('x-auth-token');
    if (!token) return { orgId: null, role: null };
    const payload = await verifyToken(token) as TokenPayload;
    return { orgId: payload?.orgId ?? null, role: payload?.role ?? null };
  } catch {
    return { orgId: null, role: null };
  }
}

export function requireMarketplaceReadRole(role: string | null): boolean {
  if (!role) return false;
  
  // Use the canonical governance matrix as the single source of truth
  // This correctly allows only roles with explicit MARKETPLACE access
  return ROLE_MODULE_ACCESS[role as Role]?.[ModuleKey.MARKETPLACE] === true;
}



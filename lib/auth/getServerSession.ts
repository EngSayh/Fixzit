/**
 * Server-side session helper for API routes
 * Uses NextAuth's auth() function to get session with all custom fields
 */

import { auth } from "@/auth";
import {
  setSuperAdminTenantContext,
  setTenantContext,
} from "@/server/plugins/tenantIsolation";

export interface ServerSession {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    role: string;
    orgId: string | null;
    isSuperAdmin: boolean;
    permissions: string[];
    roles: string[];
  };
}

/**
 * Get authenticated session in API routes
 * Returns null if not authenticated
 *
 * Usage:
 * ```typescript
 * const session = await getServerSession();
 * if (!session) {
 *   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 * }
 * const userId = session.user.id;
 * ```
 */
export async function getServerSession(): Promise<ServerSession | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  if (session.user.orgId) {
    if (session.user.isSuperAdmin) {
      setSuperAdminTenantContext(String(session.user.orgId), session.user.id);
    } else {
      setTenantContext({ orgId: session.user.orgId, userId: session.user.id });
    }
  }

  // Return session with all custom fields
  return {
    user: {
      id: session.user.id,
      email: session.user.email || null,
      name: session.user.name || null,
      role: session.user.role || "USER",
      orgId: session.user.orgId || null,
      isSuperAdmin: session.user.isSuperAdmin || false,
      permissions: session.user.permissions || [],
      roles: session.user.roles || [],
    },
  };
}

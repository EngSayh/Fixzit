'use client';

import { useSession } from 'next-auth/react';

/**
 * Extended User Type with Fixzit-specific fields
 */
interface ExtendedUser {
  id: string;
  email: string;
  name: string;
  role?: string;
  tenantId?: string;
  sellerId?: string;
}

/**
 * Authenticated Session Data
 */
export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  sellerId?: string; // For marketplace sellers
  isAuthenticated: boolean;
}

/**
 * Hook to get current authenticated session
 * @returns AuthSession or null if not authenticated
 */
export function useAuthSession(): AuthSession | null {
  const { data: session, status } = useSession();
  
  if (status === 'loading') {
    return null;
  }
  
  if (!session?.user) {
    return null;
  }
  
  const user = session.user as ExtendedUser;
  
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role || 'GUEST',
    tenantId: user.tenantId || '',
    sellerId: user.sellerId,
    isAuthenticated: true,
  };
}

/**
 * Server-side session helper (for Server Components and API routes)
 */
export async function getServerAuthSession(): Promise<AuthSession | null> {
  const { auth } = await import('@/auth');
  
  const session = await auth();
  
  if (!session?.user) {
    return null;
  }
  
  const user = session.user as ExtendedUser;
  
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role || 'GUEST',
    tenantId: user.tenantId || '',
    sellerId: user.sellerId,
    isAuthenticated: true,
  };
}

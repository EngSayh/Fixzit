/**
 * Auth-related type definitions
 * Provides typed DTOs for authentication flows to prevent schema drift
 */

import type { UserRoleType } from './user';

/**
 * Minimal user shape returned from MongoDB for auth operations.
 * Use this instead of ad-hoc inline type casts in auth.config.ts
 * to ensure consistent typing across OAuth and credentials flows.
 */
export interface AuthUserShape {
  _id?: string;
  orgId?: string | null;
  isSuperAdmin?: boolean;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
  role?: UserRoleType;
  professional?: {
    role?: string;
  };
}

/**
 * Extended user type for session/token propagation
 */
export interface ExtendedSessionUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
  orgId?: string | null;
  isSuperAdmin?: boolean;
  permissions?: string[];
  roles?: string[];
  rememberMe?: boolean;
}

/**
 * Helper to safely extract role from AuthUserShape
 * Prioritizes professional.role > role > fallback
 */
export function extractUserRole(
  user: AuthUserShape | null,
  fallback: UserRoleType | 'GUEST' = 'GUEST'
): UserRoleType | 'GUEST' {
  if (!user) return fallback;
  return (user.professional?.role || user.role || fallback) as UserRoleType | 'GUEST';
}

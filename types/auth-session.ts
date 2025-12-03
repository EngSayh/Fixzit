/**
 * Extended User Type with Fixzit-specific fields
 * Aligned with JWT/session callback in auth.config.ts
 */
export interface ExtendedUser {
  id: string;
  email: string;
  name: string;
  role?: string;
  orgId?: string;
  tenantId?: string;
  sellerId?: string;
  // RBAC fields (STRICT v4.1) - must match auth.config.ts session callback
  subRole?: string | null;
  permissions?: string[];
  roles?: string[];
  isSuperAdmin?: boolean;
}

/**
 * Authenticated Session Data
 * Includes full RBAC metadata for client/server-side access control
 */
export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  role: string;
  orgId: string | null; // Organization ID for multi-tenant scoping
  tenantId: string | null; // null when missing (e.g., SUPER_ADMIN or incomplete profile)
  sellerId?: string; // For marketplace sellers
  isAuthenticated: boolean;
  // RBAC fields (STRICT v4.1) - for feature gating aligned with auth.config.ts
  subRole: string | null; // Sub-role specialization (HR_OFFICER, FINANCE_OFFICER, etc.)
  permissions: string[]; // Granular permission array
  roles: string[]; // Role array for multi-role users
  isSuperAdmin: boolean; // Super admin bypass flag
}

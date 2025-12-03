export interface ExtendedUser {
  id: string;
  email: string;
  name: string;
  role?: string;
  orgId?: string;
  tenantId?: string;
  sellerId?: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  role: string;
  orgId: string | null;
  tenantId: string | null;
  sellerId?: string;
  isAuthenticated: boolean;
}

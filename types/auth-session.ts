export interface ExtendedUser {
  id: string;
  email: string;
  name: string;
  role?: string;
  tenantId?: string;
  sellerId?: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  sellerId?: string; // For marketplace sellers
  isAuthenticated: boolean;
}

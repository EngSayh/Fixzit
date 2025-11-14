// TypeScript module augmentation for NextAuth
// Extends the built-in session and JWT types with custom fields

import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'VENDOR' | 'OWNER' | 'TENANT' | 'VIEWER' | 'GUEST';
      subscriptionPlan: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | 'DEFAULT';
      locale?: string;
      orgId: string | null;
      sessionId: string | null;
      isSuperAdmin: boolean;
      permissions: string[];
      roles: string[];
      tenantId?: string;
      userId?: string;
    };
  }

  interface User {
    id: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'VENDOR' | 'OWNER' | 'TENANT' | 'VIEWER' | 'GUEST';
    subscriptionPlan: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | 'DEFAULT';
    locale?: string;
    orgId: string | null;
    sessionId: string | null;
    isSuperAdmin?: boolean;
    permissions?: string[];
    roles?: string[];
    tenantId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    subscriptionPlan: string;
    locale?: string;
    orgId: string | null;
    isSuperAdmin?: boolean;
    permissions?: string[];
    roles?: string[];
    tenantId?: string;
  }
}

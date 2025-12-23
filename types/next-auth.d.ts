// TypeScript module augmentation for NextAuth
// Extends the built-in session and JWT types with custom fields

import "next-auth";
import "next-auth/jwt";
import type { UserRoleType } from "@/types/user";
import type { SubscriptionPlan } from "@/config/navigation";

type SessionRole = UserRoleType | "GUEST";
type SessionPlan = SubscriptionPlan | "STARTER" | "PROFESSIONAL";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: SessionRole;
      subscriptionPlan: SessionPlan;
      locale?: string;
      orgId: string | null;
      sessionId: string | null;
      isSuperAdmin: boolean;
      permissions: string[];
      roles: string[];
      tenantId?: string;
      userId?: string;
      language?: string; // Added for Phase 2 preferences
      currency?: string; // Added for Phase 2 preferences
    };
  }

  interface User {
    id: string;
    role: SessionRole;
    subscriptionPlan: SessionPlan;
    locale?: string;
    orgId: string | null;
    sessionId: string | null;
    isSuperAdmin?: boolean;
    permissions?: string[];
    roles?: string[];
    tenantId?: string;
    language?: string; // Added for Phase 2 preferences
    currency?: string; // Added for Phase 2 preferences
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: SessionRole;
    subscriptionPlan: SessionPlan;
    locale?: string;
    orgId: string | null;
    isSuperAdmin?: boolean;
    permissions?: string[];
    roles?: string[];
    tenantId?: string;
    language?: string; // Added for Phase 2 preferences
    currency?: string; // Added for Phase 2 preferences
  }
}

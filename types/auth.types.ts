/**
 * Authentication Types
 * 
 * CRITICAL: This file MUST NOT import from mongoose or any server models
 * to prevent mongoose schemas from being bundled into client-side code.
 * 
 * @see https://github.com/vercel/next.js/issues/57792
 */

import type { Types } from 'mongoose';

/**
 * User document shape used in auth callbacks
 * Mirrors UserDoc from server/models/User.ts without importing mongoose
 */
export interface AuthUserDoc {
  _id: string | Types.ObjectId;
  email: string;
  password: string;
  status?: string;
  orgId?: string | { toString(): string } | null;
  subscriptionPlan?: string;
  isSuperAdmin?: boolean;
  permissions?: string[];
  roles?: Array<string | { toString(): string }>;
  role?: string;
  personal?: {
    firstName?: string;
    lastName?: string;
  };
  professional?: {
    role?: string;
  };
  security?: {
    locked?: boolean;
    lockReason?: string;
    lockTime?: Date;
    loginAttempts?: number;
    lastLogin?: Date;
  };
  emailVerifiedAt?: Date;
}

/**
 * Extended user type for NextAuth session callbacks
 */
export type ExtendedAuthUser = {
  id: string;
  email?: string | null;
  role?: string;
  orgId?: string | null;
  sessionId?: string | null;
  rememberMe?: boolean;
  isSuperAdmin?: boolean;
  permissions?: string[];
  roles?: string[];
};

/**
 * Server-side Auth Session Helper
 * 
 * This file is separate from useAuthSession.ts to prevent ioredis from being
 * bundled into client components. The auth.ts -> auth.config.ts -> otp-store
 * -> redis chain uses ioredis which requires the 'dns' module not available
 * in Edge/browser runtimes.
 * 
 * Use this for Server Components and API routes only.
 * 
 * @module hooks/useAuthSession.server
 */

import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import type { AuthSession } from "./useAuthSession";

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
 * Server-side session helper (for Server Components and API routes)
 * 
 * @example
 * // In a Server Component
 * import { getServerAuthSession } from "@/hooks/useAuthSession.server";
 * 
 * export default async function Page() {
 *   const session = await getServerAuthSession();
 *   if (!session) return <LoginPrompt />;
 *   return <Dashboard user={session} />;
 * }
 */
export async function getServerAuthSession(): Promise<AuthSession | null> {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  const user = session.user as ExtendedUser;

  // Warn if critical auth fields are missing rather than silently defaulting
  if (!user.role) {
    logger.warn(`[Auth] User ${user.id} missing role field`);
  }
  if (!user.tenantId && user.role !== "SUPER_ADMIN") {
    logger.warn(`[Auth] User ${user.id} missing tenantId (role: ${user.role})`);
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role || "GUEST",
    tenantId: user.tenantId || null, // Use null instead of empty string to distinguish from missing data
    sellerId: user.sellerId,
    isAuthenticated: true,
  };
}

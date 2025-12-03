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

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role || "GUEST",
    tenantId: user.tenantId || "",
    sellerId: user.sellerId,
    isAuthenticated: true,
  };
}

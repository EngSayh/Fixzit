"use server";

import { auth } from "@/auth";
import type { AuthSession, ExtendedUser } from "@/types/auth-session";

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

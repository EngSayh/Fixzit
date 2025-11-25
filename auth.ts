import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// ⚡ CRITICAL: Do NOT add database operations here
// This file is imported by middleware.ts (Edge Runtime)
// OAuth user provisioning must happen via API routes, not in auth events

// Export authOptions for compatibility with files expecting this name
export const authOptions = authConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

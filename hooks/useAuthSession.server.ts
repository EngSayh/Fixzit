"use server";

// Server-side helper is centralized to avoid bundling server-only deps into client builds.
// This wrapper keeps the public API stable.
export { getServerAuthSession } from "@/lib/server-auth-session";
export type { AuthSession } from "@/types/auth-session";

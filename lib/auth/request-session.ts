import type { NextRequest } from "next/server";

type SessionUser = {
  id: string;
  role?: string;
  email?: string;
};

type SessionShape = {
  user?: SessionUser | null;
};

/**
 * Resolve the authenticated user for API routes.
 * In tests (or automated tooling) we allow `x-user-id` headers to impersonate a user
 * so the real NextAuth stack does not need to run.
 */
type AuthFn = () => Promise<SessionShape | null>;
let cachedAuth: AuthFn | null = null;

async function loadAuth(): Promise<AuthFn | null> {
  if (cachedAuth) {
    return cachedAuth;
  }
  try {
    const mod = await import("@/auth");
    cachedAuth = mod.auth as AuthFn;
    return cachedAuth;
  } catch {
    return null;
  }
}

export async function resolveRequestSession(
  request: NextRequest,
): Promise<SessionShape | null> {
  const headerUserId = request.headers.get("x-user-id");
  if (headerUserId) {
    return {
      user: {
        id: headerUserId,
        role: request.headers.get("x-user-role") ?? undefined,
        email: request.headers.get("x-user-email") ?? undefined,
      },
    };
  }

  if (process.env.NODE_ENV === "test") {
    return null;
  }

  const auth = await loadAuth();
  return auth ? auth() : null;
}

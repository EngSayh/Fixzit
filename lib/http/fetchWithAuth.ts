import { logger } from "@/lib/logger";

/**
 * fetchWithAuth: wraps fetch to automatically attempt a token refresh on 401/419.
 * Assumes backend issues httpOnly cookies (fxz.access/fxz.refresh) and /api/auth/refresh rotates them.
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const doFetch = async () =>
    fetch(input, {
      ...init,
      credentials: "include",
    });

  let response = await doFetch();
  if (response.status !== 401 && response.status !== 419) {
    return response;
  }

  try {
    const refresh = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (!refresh.ok) {
      return response;
    }
    response = await doFetch();
  } catch (error) {
    logger.warn("[fetchWithAuth] refresh failed", { error });
  }
  return response;
}

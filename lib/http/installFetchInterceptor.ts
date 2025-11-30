import { logger } from "@/lib/logger";

let installed = false;

/**
 * Installs a global fetch interceptor on the client that retries once after
 * refreshing auth cookies (via /api/auth/refresh) when a 401/419 is received.
 * Safe to call multiple times; only installs once. Same-origin requests only.
 */
export const installFetchInterceptor = () => {
  if (typeof window === "undefined" || installed) return;
  const originalFetch = window.fetch.bind(window);

  const isSameOrigin = (input: RequestInfo | URL) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : input?.toString?.() || "";
    if (!url) return false;
    return url.startsWith("/") || url.startsWith(window.location.origin);
  };

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!isSameOrigin(input)) {
      return originalFetch(input, init);
    }

    const doFetch = () =>
      originalFetch(input, {
        ...init,
        credentials: init?.credentials ?? "include",
      });

    let response = await doFetch();
    if (response.status !== 401 && response.status !== 419) {
      return response;
    }

    try {
      const refresh = await originalFetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      if (!refresh.ok) {
        return response;
      }
      response = await doFetch();
    } catch (error) {
      logger.warn("[fetchInterceptor] refresh failed", { error });
    }
    return response;
  };

  installed = true;
  logger.info("[fetchInterceptor] installed global auth interceptor");
};

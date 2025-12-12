/**
 * Safe fetch wrapper for client-side components
 *
 * Provides comprehensive error handling, timeout support, and type-safe responses.
 * Use instead of raw fetch() in React components.
 *
 * For server-side/jobs, use:
 * - lib/http/fetchWithRetry.ts (retry logic + circuit breaker)
 * - lib/http/fetchWithAuth.ts (auth token refresh)
 *
 * @module lib/utils/safe-fetch
 */

import { logger } from "@/lib/logger";

/**
 * Safe fetch result - discriminated union for type safety
 */
export type SafeFetchResult<T> =
  | { ok: true; data: T; status: number; error: undefined }
  | { ok: false; data: undefined; status: number; error: string };

export type SafeFetchOptions = RequestInit & {
  /**
   * Timeout in milliseconds (default: 30000)
   */
  timeoutMs?: number;
  /**
   * Context label for logging
   */
  context?: string;
  /**
   * Suppress error logging (for expected failures)
   */
  silent?: boolean;
  /**
   * Tenant/org ID to include in headers
   */
  tenantId?: string;
};

/**
 * Safely fetch JSON data with comprehensive error handling.
 * Returns a discriminated union - never throws.
 *
 * @example
 * ```typescript
 * const result = await safeFetch<User[]>('/api/users');
 * if (result.ok) {
 *   setUsers(result.data);
 * } else {
 *   setError(result.error);
 * }
 * ```
 */
export async function safeFetch<T = unknown>(
  url: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult<T>> {
  const {
    timeoutMs = 30_000,
    context,
    silent = false,
    tenantId,
    headers: customHeaders,
    ...fetchOptions
  } = options;

  // Build headers
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(tenantId ? { "x-tenant-id": tenantId } : {}),
    ...(customHeaders as Record<string, string>),
  };

  // Create timeout controller
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle non-OK responses
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      // Try to extract error message from response body
      try {
        const errorBody = await response.json();
        if (typeof errorBody?.error === "string") {
          errorMessage = errorBody.error;
        } else if (typeof errorBody?.message === "string") {
          errorMessage = errorBody.message;
        }
      } catch {
        // Response body not JSON - use status text
      }

      if (!silent) {
        logger.warn("[safeFetch] Request failed", {
          url,
          context,
          status: response.status,
          error: errorMessage,
        });
      }

      return {
        ok: false,
        data: undefined,
        status: response.status,
        error: errorMessage,
      };
    }

    // Handle empty responses (204 No Content, etc.)
    const contentLength = response.headers.get("content-length");
    if (contentLength === "0" || response.status === 204) {
      return {
        ok: true,
        data: undefined as T,
        status: response.status,
        error: undefined,
      };
    }

    // Parse JSON response
    try {
      const data = (await response.json()) as T;
      return {
        ok: true,
        data,
        status: response.status,
        error: undefined,
      };
    } catch (parseError) {
      const errorMessage = "Failed to parse response as JSON";

      if (!silent) {
        logger.warn("[safeFetch] JSON parse error", {
          url,
          context,
          status: response.status,
          error: parseError instanceof Error ? parseError.message : String(parseError),
        });
      }

      return {
        ok: false,
        data: undefined,
        status: response.status,
        error: errorMessage,
      };
    }
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle specific error types
    let errorMessage: string;
    let status = 0;

    if (error instanceof DOMException && error.name === "AbortError") {
      errorMessage = `Request timed out after ${timeoutMs}ms`;
      status = 408; // Request Timeout
    } else if (error instanceof TypeError) {
      // Network errors (offline, DNS failure, CORS, etc.)
      errorMessage = "Network error: Unable to reach server";
      status = 0;
    } else {
      errorMessage = error instanceof Error ? error.message : "Unknown error";
    }

    if (!silent) {
      logger.error("[safeFetch] Request exception", {
        url,
        context,
        error: errorMessage,
        errorType: error?.constructor?.name,
      });
    }

    return {
      ok: false,
      data: undefined,
      status,
      error: errorMessage,
    };
  }
}

/**
 * Safe POST request with JSON body
 *
 * @example
 * ```typescript
 * const result = await safePost<User>('/api/users', { name: 'John' });
 * if (result.ok) {
 *   console.log('Created:', result.data);
 * }
 * ```
 */
export function safePost<T = unknown, B = unknown>(
  url: string,
  body: B,
  options: Omit<SafeFetchOptions, "body" | "method"> = {}
): Promise<SafeFetchResult<T>> {
  return safeFetch<T>(url, {
    ...options,
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Safe PUT request with JSON body
 */
export function safePut<T = unknown, B = unknown>(
  url: string,
  body: B,
  options: Omit<SafeFetchOptions, "body" | "method"> = {}
): Promise<SafeFetchResult<T>> {
  return safeFetch<T>(url, {
    ...options,
    method: "PUT",
    body: JSON.stringify(body),
  });
}

/**
 * Safe PATCH request with JSON body
 */
export function safePatch<T = unknown, B = unknown>(
  url: string,
  body: B,
  options: Omit<SafeFetchOptions, "body" | "method"> = {}
): Promise<SafeFetchResult<T>> {
  return safeFetch<T>(url, {
    ...options,
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/**
 * Safe DELETE request
 */
export function safeDelete<T = unknown>(
  url: string,
  options: Omit<SafeFetchOptions, "method"> = {}
): Promise<SafeFetchResult<T>> {
  return safeFetch<T>(url, {
    ...options,
    method: "DELETE",
  });
}

/**
 * React hook helper - wraps safeFetch for use in useEffect
 *
 * @example
 * ```typescript
 * useEffect(() => {
 *   const { cancel } = fetchWithCancel<User[]>(
 *     '/api/users',
 *     (result) => {
 *       if (result.ok) setUsers(result.data);
 *       else setError(result.error);
 *     }
 *   );
 *   return cancel;
 * }, []);
 * ```
 */
export function fetchWithCancel<T>(
  url: string,
  onComplete: (result: SafeFetchResult<T>) => void,
  options: SafeFetchOptions = {}
): { cancel: () => void } {
  const controller = new AbortController();

  safeFetch<T>(url, {
    ...options,
    signal: controller.signal,
  }).then(onComplete);

  return {
    cancel: () => controller.abort(),
  };
}

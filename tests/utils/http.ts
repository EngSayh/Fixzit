/**
 * HTTP test utilities
 * Provides helpers for making API requests in tests
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

/**
 * Makes a test HTTP request with proper base URL handling
 * @param path - API path (e.g., '/api/qa/alert')
 * @param options - Fetch options
 * @returns Response object
 */
export async function makeReq(
  path: string,
  options?: RequestInit,
): Promise<Response> {
  const url = `${BASE_URL}${path}`;
  return fetch(url, options);
}

/**
 * Makes a test HTTP request and returns JSON
 * @param path - API path
 * @param options - Fetch options
 * @returns Parsed JSON response
 */
export async function makeJsonReq<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await makeReq(path, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Makes a test HTTP POST request with JSON body
 * @param path - API path
 * @param body - Request body
 * @param options - Additional fetch options
 * @returns Response object
 */
export async function makePostReq(
  path: string,
  body: unknown,
  options?: Omit<RequestInit, "method" | "body">,
): Promise<Response> {
  return makeReq(path, {
    ...options,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    body: JSON.stringify(body),
  });
}

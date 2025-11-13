/**
 * Safe Fetch Utilities
 * 
 * Provides error-handled fetch wrappers to prevent unhandled promise rejections.
 * All fetch calls in the application should use these utilities.
 * 
 * @module lib/fetch-utils
 */

/**
 * Custom error class for fetch failures
 */
export class FetchError extends Error {
  public readonly status?: number;
  public readonly statusText?: string;
  public readonly url?: string;
  
  constructor(
    message: string,
    status?: number,
    statusText?: string,
    url?: string
  ) {
    super(message);
    this.name = 'FetchError';
    this.status = status;
    this.statusText = statusText;
    this.url = url;
  }
}

/**
 * Safe fetch with automatic error handling
 * 
 * @param url - URL to fetch
 * @param options - Fetch options
 * @returns Promise that resolves to Response or rejects with FetchError
 * 
 * @example
 * ```typescript
 * const response = await safeFetch('/api/users');
 * if (response.ok) {
 *   const data = await response.json();
 * }
 * ```
 */
export async function safeFetch(
  url: string | URL | Request,
  options?: RequestInit
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    // Log failed requests in development
    if (!response.ok && process.env.NODE_ENV === 'development') {
      console.warn(
        `[safeFetch] HTTP ${response.status} ${response.statusText} - ${url.toString()}`
      );
    }
    
    return response;
  } catch (error) {
    // Network error, CORS error, or other fetch failure
    const urlString = url.toString();
    const message = error instanceof Error ? error.message : 'Unknown fetch error';
    
    console.error(`[safeFetch] Failed to fetch ${urlString}:`, error);
    
    throw new FetchError(
      `Failed to fetch ${urlString}: ${message}`,
      undefined,
      undefined,
      urlString
    );
  }
}

/**
 * Safe fetch with automatic JSON parsing
 * 
 * @param url - URL to fetch
 * @param options - Fetch options  
 * @returns Promise that resolves to parsed JSON data
 * @throws FetchError if request fails or response is not JSON
 * 
 * @example
 * ```typescript
 * const users = await safeFetchJSON('/api/users');
 * console.log(users);
 * ```
 */
export async function safeFetchJSON<T = unknown>(
  url: string | URL | Request,
  options?: RequestInit
): Promise<T> {
  const response = await safeFetch(url, options);
  
  if (!response.ok) {
    const urlString = url.toString();
    throw new FetchError(
      `HTTP ${response.status} ${response.statusText}`,
      response.status,
      response.statusText,
      urlString
    );
  }
  
  try {
    return await response.json();
  } catch (error) {
    const urlString = url.toString();
    const message = error instanceof Error ? error.message : 'Invalid JSON';
    throw new FetchError(
      `Failed to parse JSON from ${urlString}: ${message}`,
      response.status,
      response.statusText,
      urlString
    );
  }
}

/**
 * Safe fetcher for SWR
 * 
 * SWR expects fetcher to throw on HTTP errors.
 * This wrapper ensures proper error handling.
 * 
 * @param url - URL to fetch
 * @returns Promise that resolves to parsed JSON or throws
 * 
 * @example
 * ```typescript
 * const { data, error } = useSWR('/api/users', safeFetcher);
 * ```
 */
export const safeFetcher = async (url: string): Promise<unknown> => {
  return safeFetchJSON(url);
};

/**
 * Safe fetch with retry logic
 * 
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param retries - Number of retries (default: 3)
 * @param retryDelay - Delay between retries in ms (default: 1000)
 * @returns Promise that resolves to Response
 * 
 * @example
 * ```typescript
 * const response = await safeFetchWithRetry('/api/critical-endpoint', {}, 5, 2000);
 * ```
 */
export async function safeFetchWithRetry(
  url: string | URL | Request,
  options?: RequestInit,
  retries: number = 3,
  retryDelay: number = 1000
): Promise<Response> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await safeFetch(url, options);
      
      // Retry on 5xx errors
      if (response.status >= 500 && response.status < 600 && attempt < retries) {
        console.warn(
          `[safeFetchWithRetry] HTTP ${response.status} - Retry ${attempt + 1}/${retries} in ${retryDelay}ms`
        );
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt < retries) {
        console.warn(
          `[safeFetchWithRetry] Attempt ${attempt + 1} failed - Retrying in ${retryDelay}ms`,
          lastError
        );
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}

/**
 * Create a fetch wrapper with default options
 * 
 * @param defaultOptions - Default fetch options
 * @returns Configured safe fetch function
 * 
 * @example
 * ```typescript
 * const apiFetch = createSafeFetch({
 *   headers: { 'Authorization': `Bearer ${token}` }
 * });
 * 
 * const response = await apiFetch('/api/protected');
 * ```
 */
export function createSafeFetch(defaultOptions: RequestInit = {}) {
  return async function (
    url: string | URL | Request,
    options?: RequestInit
  ): Promise<Response> {
    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options?.headers,
      },
    };
    
    return safeFetch(url, mergedOptions);
  };
}

/**
 * Request context utilities for Finance Pack
 * Provides thread-safe user/tenant context for service layer
 */

export interface RequestContext {
  userId: string;
  orgId: string;
  role?: string;
  timestamp: Date;
}

// AsyncLocalStorage for thread-safe context in Node.js
// Note: In actual implementation, this would use Node's AsyncLocalStorage API
// For now, using a simple in-memory store (NOT thread-safe, for development only)
let currentContext: RequestContext | null = null;

/**
 * Set request context for current execution
 * Should be called at the beginning of each request handler
 */
export function setRequestContext(context: RequestContext): void {
  currentContext = context;
}

/**
 * Get current request context
 * @throws Error if context not set (use requireContext for auto-throw)
 */
export function getRequestContext(): RequestContext | null {
  return currentContext;
}

/**
 * Require context to be set, throw if missing
 * Use this in service methods that require authentication
 */
export function requireContext(): RequestContext {
  if (!currentContext) {
    throw new Error('Request context not set. Call setRequestContext() first.');
  }
  return currentContext;
}

/**
 * Clear request context (call at end of request)
 */
export function clearRequestContext(): void {
  currentContext = null;
}

/**
 * Execute function within a specific context
 * Automatically cleans up after execution
 */
export async function withContext<T>(
  context: RequestContext,
  fn: () => Promise<T>
): Promise<T> {
  const previousContext = currentContext;
  try {
    setRequestContext(context);
    return await fn();
  } finally {
    currentContext = previousContext;
  }
}

const authContextService = {
  setRequestContext,
  getRequestContext,
  requireContext,
  clearRequestContext,
  withContext,
};
export default authContextService;

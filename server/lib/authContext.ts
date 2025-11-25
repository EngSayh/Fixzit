/**
 * Request context utilities for Finance Pack
 * Provides thread-safe user/tenant context for service layer using AsyncLocalStorage
 */

import { logger } from "@/lib/logger";
import { AsyncLocalStorage } from "async_hooks";

export interface RequestContext {
  userId: string;
  orgId: string;
  role: string;
  timestamp: Date;
}

/**
 * Custom error class for missing request context
 * Thrown when requireContext() is called outside of a runWithContext() block
 */
export class ContextMissingError extends Error {
  constructor(
    message: string = "Request context not set. Wrap your code in runWithContext().",
  ) {
    super(message);
    this.name = "ContextMissingError";
    Error.captureStackTrace(this, this.constructor);
  }
}

// Thread-safe context storage using Node.js AsyncLocalStorage
const requestStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Set request context for current execution (DEPRECATED - use runWithContext)
 * Kept for backward compatibility but prefer runWithContext
 * @deprecated Use runWithContext instead for proper async context isolation
 */

export function setRequestContext(_context: RequestContext): void {
  // This is a no-op now - context must be set via runWithContext
  logger.warn("setRequestContext is deprecated. Use runWithContext instead.");
}

/**
 * Get current request context from AsyncLocalStorage
 * @returns RequestContext if set, null otherwise
 */
export function getRequestContext(): RequestContext | null {
  return requestStorage.getStore() ?? null;
}

/**
 * Require context to be set, throw if missing
 * Use this in service methods that require authentication
 * @throws {ContextMissingError} When called outside of runWithContext()
 */
export function requireContext(): RequestContext {
  const context = requestStorage.getStore();
  if (!context) {
    throw new ContextMissingError();
  }
  return context;
}

/**
 * Clear request context (NO-OP with AsyncLocalStorage)
 * Context is automatically cleaned up when async context ends
 * @deprecated No longer needed with AsyncLocalStorage
 */
export function clearRequestContext(): void {
  // No-op - AsyncLocalStorage handles cleanup automatically
}

/**
 * Execute function within a specific context (NEW RECOMMENDED API)
 * Automatically isolates context per async execution chain
 *
 * @example
 * await runWithContext({ userId: '123', orgId: '456', timestamp: new Date() }, async () => {
 *   // All code here and in called functions has access to context
 *   const ctx = requireContext(); // Works safely
 *   await someServiceMethod(); // Also has access to context
 * });
 */
export async function runWithContext<T>(
  context: RequestContext,
  fn: () => Promise<T>,
): Promise<T> {
  return await requestStorage.run(context, fn);
}

/**
 * Legacy alias for backward compatibility
 * @deprecated Use runWithContext instead
 */
export async function withContext<T>(
  context: RequestContext,
  fn: () => Promise<T>,
): Promise<T> {
  return runWithContext(context, fn);
}

const authContextService = {
  setRequestContext,
  getRequestContext,
  requireContext,
  clearRequestContext,
  withContext,
  runWithContext,
};
export default authContextService;

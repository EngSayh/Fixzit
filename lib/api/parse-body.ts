/**
 * Safe JSON body parsing utility for API routes
 * @module lib/api/parse-body
 * 
 * 🔒 SECURITY: Wraps request.json() with try-catch to prevent
 * unhandled errors from malformed JSON bodies.
 * 
 * @example
 * ```ts
 * import { parseBody, parseBodyOrNull } from "@/lib/api/parse-body";
 * 
 * // Option 1: Throws APIParseError on invalid JSON
 * const body = await parseBody<CreateUserBody>(request);
 * 
 * // Option 2: Returns null on invalid JSON
 * const body = await parseBodyOrNull<CreateUserBody>(request);
 * if (!body) {
 *   return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
 * }
 * ```
 */

/**
 * Custom error for JSON parsing failures
 */
export class APIParseError extends Error {
  public readonly statusCode = 400;

  constructor(message = "Invalid JSON body") {
    super(message);
    this.name = "APIParseError";
  }
}

/**
 * Parse request body as JSON with error handling
 * @throws {APIParseError} If body is not valid JSON
 */
export async function parseBody<T = unknown>(request: Request): Promise<T> {
  try {
    return await request.json() as T;
  } catch {
    throw new APIParseError("Invalid JSON body - could not parse request body");
  }
}

/**
 * Parse request body as JSON, returning null on failure
 * Use when you want to handle invalid JSON gracefully without throwing
 * @deprecated Use parseBodySafe instead for better observability
 */
export async function parseBodyOrNull<T = unknown>(request: Request): Promise<T | null> {
  try {
    return await request.json() as T;
  } catch {
    return null;
  }
}

/**
 * Parse request body with a fallback value
 * Use when you need a default for optional request bodies
 * @deprecated Use parseBodySafe instead for better observability
 */
export async function parseBodyWithDefault<T>(
  request: Request,
  defaultValue: T
): Promise<T> {
  try {
    const body = await request.json();
    return body as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Safe JSON body parser with observability
 * Returns { data, error } tuple for explicit error handling
 * Logs parse failures with correlation ID for debugging
 * 
 * @example
 * ```ts
 * const { data: body, error } = await parseBodySafe<MyBodyType>(req);
 * if (error) {
 *   return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
 * }
 * // body is now typed as MyBodyType
 * ```
 */
export async function parseBodySafe<T = unknown>(
  request: Request,
  options?: { logPrefix?: string }
): Promise<{ data: T; error: null } | { data: null; error: string }> {
  try {
    const data = await request.json() as T;
    return { data, error: null };
  } catch (err) {
    const correlationId = crypto.randomUUID();
    // Dynamic import to avoid circular dependency
    const { logger } = await import("@/lib/logger");
    logger.warn(`${options?.logPrefix || "[API]"} JSON parse failed`, {
      correlationId,
      error: err instanceof Error ? err.message : String(err),
      url: request.url,
    });
    return { data: null, error: `Invalid JSON body (ref: ${correlationId})` };
  }
}

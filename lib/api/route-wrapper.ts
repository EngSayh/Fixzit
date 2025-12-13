import { internalServerError } from "@/server/utils/errorResponses";
import { logger } from "@/lib/logger";
import type { NextResponse } from "next/server";

type RouteReturn = Response | NextResponse;
type RouteHandler<TArgs extends unknown[]> = (
  ...args: TArgs
) => Promise<RouteReturn> | RouteReturn;

/**
 * Minimal try/catch wrapper for Next.js App Router route handlers.
 * Logs unexpected errors and falls back to a standardized 500 response.
 */
export function wrapRoute<TArgs extends unknown[]>(
  handler: RouteHandler<TArgs>,
  label: string,
): RouteHandler<TArgs> {
  return async (...args: TArgs) => {
    try {
      return await handler(...args);
    } catch (error) {
      logger.error(label, {
        error: error instanceof Error ? error.message : String(error),
      });
      return internalServerError();
    }
  };
}

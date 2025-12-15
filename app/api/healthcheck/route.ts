/**
 * @fileoverview Legacy Healthcheck Alias
 * @description Re-exports the main health check endpoint for backward compatibility with older monitoring configurations.
 * @route GET /api/healthcheck - Alias for /api/health
 * @access Public
 * @module health
 */

import { NextRequest } from "next/server";
import { internalServerError } from "@/server/utils/errorResponses";
import { logger } from "@/lib/logger";
import { GET as healthGet } from "../health/route";

export const dynamic = "force-dynamic";

// Inline try/catch wrapper keeps the alias simple for Next.js static analysis
export async function GET(request: NextRequest) {
  try {
    return await healthGet(request);
  } catch (error) {
    logger.error("api.healthcheck.get.catch", {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalServerError();
  }
}

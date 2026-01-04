import { NextRequest } from "next/server";
import { createSecureResponse } from "@/server/security/headers";
import { logger } from "@/lib/logger";

/**
 * DEPRECATED: Legacy recurring charge endpoint (removed Q4 2025).
 *
 * Tap Payments uses saved cards + charge API; this legacy endpoint is kept as a
 * guarded stub to prevent old callbacks from breaking routes.
 * Returns 501 to indicate deprecated functionality.
 */
export async function POST(req: NextRequest) {
  logger.warn("[Billing] Legacy recurring charge endpoint called - deprecated");
  
  return createSecureResponse(
    { 
      error: "DEPRECATED_ENDPOINT", 
      message: "Legacy recurring charges removed. Use Tap Payments recurring flows instead." 
    }, 
    501, 
    req
  );
}

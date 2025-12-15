import { NextRequest } from "next/server";
import { createSecureResponse } from "@/server/security/headers";
import { logger } from "@/lib/logger";

/**
 * DEPRECATED: Legacy PayTabs recurring charge endpoint
 * 
 * This endpoint was designed for PayTabs token-based recurring charges.
 * Tap Payments has a different recurring billing model (saved cards + charge API).
 * 
 * TODO: Implement new recurring billing using Tap's Card Vault API:
 * https://developers.tap.company/reference/create-a-card
 * 
 * For now, this endpoint returns 501 Not Implemented.
 */
export async function POST(req: NextRequest) {
  logger.warn("[Billing] Legacy PayTabs recurring charge endpoint called - not supported");
  
  return createSecureResponse(
    { 
      error: "NOT_IMPLEMENTED", 
      message: "PayTabs recurring charges deprecated. Migrate to Tap Payments Card Vault API." 
    }, 
    501, 
    req
  );
}

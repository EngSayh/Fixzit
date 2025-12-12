/**
 * @description Initiates a return request from a buyer for a Souq order.
 * Creates an RMA (Return Merchandise Authorization) record with item details
 * and optional buyer photos documenting the issue.
 * @route POST /api/souq/returns/initiate
 * @access Private - Authenticated buyers only
 * @param {Object} body.orderId - The order ID to return items from
 * @param {Object} body.items - Array of items to return with quantities and reasons
 * @param {Object} body.buyerPhotos - Optional array of photo URLs documenting issues
 * @returns {Object} success: true, rmaId: created RMA identifier
 * @throws {400} If validation fails or order not found
 * @throws {401} If user is not authenticated
 * @throws {403} If organization context missing or user not order buyer
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { returnsService } from "@/services/souq/returns-service";
import { initiateSchema, parseJsonBody, formatZodError } from "../validation";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

/**
 * POST /api/souq/returns/initiate
 * Initiate a return request
 * Buyer-only endpoint
 */
export async function POST(request: NextRequest) {
  // Rate limiting: 10 requests per minute per IP for return initiation
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-returns:initiate",
    requests: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = (session.user as { orgId?: string }).orgId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }

    const parsed = await parseJsonBody(request, initiateSchema);
    if (!parsed.success) {
      return NextResponse.json(formatZodError(parsed.error), { status: 400 });
    }
    const { orderId, items, buyerPhotos } = parsed.data;

    // Initiate return
    const rmaId = await returnsService.initiateReturn({
      orderId,
      buyerId: session.user.id,
      orgId,
      items,
      buyerPhotos,
    });

    return NextResponse.json({
      success: true,
      rmaId,
      message: "Return request submitted successfully",
    });
  } catch (error) {
    logger.error("Initiate return error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to initiate return",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

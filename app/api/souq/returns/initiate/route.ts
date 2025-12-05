import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { returnsService } from "@/services/souq/returns-service";

/**
 * POST /api/souq/returns/initiate
 * Initiate a return request
 * Buyer-only endpoint
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { orderId, items, buyerPhotos } = body;

    // Validation
    if (!orderId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: orderId, items (must be non-empty array)",
        },
        { status: 400 },
      );
    }

    // Validate item structure
    for (const item of items) {
      if (!item.listingId || !item.quantity || !item.reason) {
        return NextResponse.json(
          {
            error: "Each item must have: listingId, quantity, reason",
          },
          { status: 400 },
        );
      }
    }

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

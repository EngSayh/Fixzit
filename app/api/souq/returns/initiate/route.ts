import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { returnsService } from "@/services/souq/returns-service";
import { initiateSchema, parseJsonBody, formatZodError } from "../validation";

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

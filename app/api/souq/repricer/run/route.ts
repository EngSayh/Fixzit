import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { AutoRepricerService } from "@/services/souq/auto-repricer-service";

/**
 * POST /api/souq/repricer/run
 * Manually trigger repricing for current seller
 */
export async function POST(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await AutoRepricerService.repriceSeller(session.user.id);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error("Manual reprice error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to run repricing",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

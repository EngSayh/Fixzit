import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { AutoRepricerService } from "@/services/souq/auto-repricer-service";

/**
 * GET /api/souq/repricer/settings
 * Get auto-repricer settings for current seller
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await AutoRepricerService.getRepricerSettings(
      session.user.id,
    );

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    logger.error("Get repricer settings error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to get repricer settings",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/souq/repricer/settings
 * Enable/update auto-repricer settings
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings) {
      return NextResponse.json(
        { error: "Settings are required" },
        { status: 400 },
      );
    }

    await AutoRepricerService.enableAutoRepricer(session.user.id, settings);

    return NextResponse.json({
      success: true,
      message: "Auto-repricer settings updated successfully",
    });
  } catch (error) {
    logger.error("Update repricer settings error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to update repricer settings",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/souq/repricer/settings
 * Disable auto-repricer
 */
export async function DELETE(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await AutoRepricerService.disableAutoRepricer(session.user.id);

    return NextResponse.json({
      success: true,
      message: "Auto-repricer disabled successfully",
    });
  } catch (error) {
    logger.error("Disable repricer error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to disable repricer",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

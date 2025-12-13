/**
 * @description Manages auto-repricer settings for Souq marketplace sellers.
 * GET retrieves current repricer configuration including price rules and competitors.
 * PUT updates repricer settings (enabled/disabled, min/max margins, strategy).
 * @route GET /api/souq/repricer/settings - Get auto-repricer settings
 * @route PUT /api/souq/repricer/settings - Update repricer settings
 * @access Private - Authenticated sellers only
 * @returns {Object} GET: repricer settings object | PUT: updated settings
 * @throws {400} If organization context missing
 * @throws {401} If user is not authenticated
 * @throws {404} If seller profile not found
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { AutoRepricerService } from "@/services/souq/auto-repricer-service";
import { SouqSeller } from "@/server/models/souq/Seller";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

/**
 * GET /api/souq/repricer/settings
 * Get auto-repricer settings for current seller
 */
export async function GET(request: NextRequest) {
  // Rate limiting: 60 requests per minute per IP for repricer settings
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-repricer:settings-get",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🔐 Get orgId from session for tenant isolation
    const orgId = session.user.orgId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 }
      );
    }

    const seller = await SouqSeller.findOne({
      userId: session.user.id,
      orgId,
    }).lean();
    if (!seller?._id) {
      return NextResponse.json(
        { error: "Seller not found for user in this organization" },
        { status: 404 },
      );
    }

    const settings = await AutoRepricerService.getRepricerSettings(
      seller._id.toString(),
      orgId,
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
  // Rate limiting: 20 requests per minute per IP for repricer settings updates
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-repricer:settings-update",
    requests: 20,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🔐 Get orgId from session for tenant isolation
    const orgId = session.user.orgId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings) {
      return NextResponse.json(
        { error: "Settings are required" },
        { status: 400 },
      );
    }

    const seller = await SouqSeller.findOne({
      userId: session.user.id,
      orgId,
    }).lean();
    if (!seller?._id) {
      return NextResponse.json(
        { error: "Seller not found for user in this organization" },
        { status: 404 },
      );
    }

    await AutoRepricerService.enableAutoRepricer(
      seller._id.toString(),
      settings,
      orgId,
    );

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

    // 🔐 Get orgId from session for tenant isolation
    const orgId = session.user.orgId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 }
      );
    }

    const seller = await SouqSeller.findOne({
      userId: session.user.id,
      orgId,
    }).lean();
    if (!seller?._id) {
      return NextResponse.json(
        { error: "Seller not found for user in this organization" },
        { status: 404 },
      );
    }

    await AutoRepricerService.disableAutoRepricer(
      seller._id.toString(),
      orgId,
    );

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

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { AutoRepricerService } from "@/services/souq/auto-repricer-service";

interface RouteContext {
  params: Promise<{ fsin: string }>;
}

/**
 * GET /api/souq/repricer/analysis/[fsin]
 * Get competitor price analysis for a product
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const orgId = session.user.orgId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 },
      );
    }

    const { fsin } = await context.params;

    if (!fsin) {
      return NextResponse.json({ error: "FSIN is required" }, { status: 400 });
    }

    const analysis = await AutoRepricerService.getCompetitorAnalysis(fsin, orgId);

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    logger.error("Get competitor analysis error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to get competitor analysis",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

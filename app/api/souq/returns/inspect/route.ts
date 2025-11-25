import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { returnsService } from "@/services/souq/returns-service";

/**
 * POST /api/souq/returns/inspect
 * Complete return inspection
 * Admin/Inspector-only endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin or inspector role
    if (!["ADMIN", "SUPER_ADMIN", "INSPECTOR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { rmaId, condition, restockable, inspectionNotes, inspectionPhotos } =
      body;

    // Validation
    if (!rmaId || !condition || restockable === undefined) {
      return NextResponse.json(
        {
          error: "Missing required fields: rmaId, condition, restockable",
        },
        { status: 400 },
      );
    }

    const validConditions = [
      "like_new",
      "good",
      "acceptable",
      "damaged",
      "defective",
    ];
    if (!validConditions.includes(condition)) {
      return NextResponse.json(
        {
          error: `Invalid condition. Must be one of: ${validConditions.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Complete inspection
    await returnsService.inspectReturn({
      rmaId,
      inspectorId: session.user.id,
      condition,
      restockable,
      inspectionNotes,
      inspectionPhotos,
    });

    return NextResponse.json({
      success: true,
      message: "Inspection completed successfully",
    });
  } catch (error) {
    logger.error("Inspect return error", { error });
    return NextResponse.json(
      {
        error: "Failed to complete inspection",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

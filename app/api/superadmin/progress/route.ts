/**
 * API route for superadmin progress dashboard
 * Returns phase data from SSOT (docs/PENDING_MASTER.md)
 */

import { NextResponse } from "next/server";
import { loadPhases, calculatePhaseSummary, PendingMasterNotFoundError } from "@/lib/superadmin/phases";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const { phases, usedFallback } = loadPhases();
    const summary = calculatePhaseSummary(phases);

    return NextResponse.json({
      phases,
      summary,
      usedFallback,
    });
  } catch (error) {
    if (error instanceof PendingMasterNotFoundError) {
      logger.warn("PENDING_MASTER.md not found, returning 404");
      return NextResponse.json(
        { error: "PENDING_MASTER.md not found" },
        { status: 404 }
      );
    }

    logger.error("Error loading phases", { error });
    return NextResponse.json(
      { error: "Failed to load progress data" },
      { status: 500 }
    );
  }
}

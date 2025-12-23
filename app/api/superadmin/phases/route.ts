/**
 * Super Admin - Phase Progress Tracking API
 * Real-time P0-P75 phase status from PENDING_MASTER.md
 * 
 * @module app/api/superadmin/phases/route
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import {
  PendingMasterNotFoundError,
  loadSuperadminPhaseData,
} from "@/lib/superadmin/phases";

/**
 * GET /api/superadmin/phases
 * Returns phase progress statistics and timeline
 * 
 * @auth SuperAdmin only
 * @returns {
 *   phases: Array<{
 *     id: string, // "P66", "P67", etc.
 *     title: string,
 *     status: "completed" | "in-progress" | "not-started",
 *     date?: string, // ISO 8601 completion date
 *     duration?: number, // minutes
 *     description: string
 *   }>,
 *   summary: {
 *     total: number,
 *     completed: number,
 *     inProgress: number,
 *     notStarted: number,
 *     completionPercentage: number
 *   },
 *   timeline: Array<{
 *     phase: string,
 *     date: string,
 *     status: string
 *   }>
 * }
 */
export async function GET(req: NextRequest) {
  // Auth check
  const session = await getSuperadminSession(req);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await loadSuperadminPhaseData();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    if (error instanceof PendingMasterNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    logger.error("[SuperAdmin Phases API] Error:", error);
    return NextResponse.json(
      { error: "Failed to parse phase data" },
      { status: 500 }
    );
  }
}

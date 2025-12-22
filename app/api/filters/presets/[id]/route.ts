/**
 * Filter Presets API – Delete
 *
 * @route DELETE /api/filters/presets/:id
 * @access Authenticated users (tenant-scoped)
 *
 * Enforces tenant isolation by scoping deletion to the current user's org_id
 * and user_id. Uses the existing FilterPreset model (org_id + user_id indices).
 */

import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getSessionUser, UnauthorizedError } from "@/server/middleware/withAuthRbac";
import { connectDb } from "@/lib/mongodb-unified";
import { FilterPreset } from "@/server/models/common/FilterPreset";
import { logger } from "@/lib/logger";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id?: string }> },
) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "filter-presets:delete",
    requests: 20,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  let session;
  try {
    session = await getSessionUser(request);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    throw error;
  }

  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const orgId = session.orgId;
  const userId = session.id;
  const { id: presetId } = await params;

  if (!orgId) {
    return NextResponse.json({ error: "Organization context required" }, { status: 403 });
  }

  if (!presetId) {
    return NextResponse.json({ error: "Preset id is required" }, { status: 400 });
  }

  try {
    await connectDb();

    const deleted = await FilterPreset.findOneAndDelete({
      _id: presetId,
      org_id: orgId,
      user_id: userId,
    });

    if (!deleted) {
      return NextResponse.json({ error: "Preset not found" }, { status: 404 });
    }

    logger.info("[FilterPresets] Deleted preset", {
      presetId,
      orgId,
      userId,
      entityType: deleted.entity_type,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[FilterPresets] DELETE failed", {
      error,
      orgId,
      userId,
      presetId,
    });
    return NextResponse.json({ error: "Failed to delete preset" }, { status: 500 });
  }
}

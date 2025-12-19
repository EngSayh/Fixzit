/**
 * @fileoverview Aqar Offline Cache Bundle API
 * @description Generates offline-capable data bundles for the Aqar mobile app.
 * Supports Progressive Web App (PWA) offline functionality with cached listings.
 * @module api/aqar/offline
 *
 * @example
 * // GET /api/aqar/offline?city=Riyadh&intent=BUY&limit=50&includeAuctions=true
 * // Returns: { listings: [...], metadata: {...}, cacheHint: "..." }
 */

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ListingIntent } from "@/server/models/aqar/Listing";
import { AqarOfflineCacheService } from "@/services/aqar/offline-cache-service";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // Rate limiting: 30 requests per minute per IP for offline bundles (expensive operation)
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "aqar:offline:get",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const correlationId = crypto.randomUUID();
  try {
    const { searchParams } = new URL(request.url);
    let user: { orgId?: string } | undefined;
    try {
      user = await getSessionUser(request);
    } catch (error) {
      if (error instanceof Error && error.message !== "Unauthorized") {
        logger.warn("AQAR_OFFLINE_SESSION_WARN", {
          error: error.message,
          correlationId,
        });
      }
    }

    const city = searchParams.get("city") || undefined;
    const intent = searchParams.get("intent") as ListingIntent | null;
    const limitRaw = searchParams.get("limit");
    const limitParsed = limitRaw ? Number(limitRaw) : undefined;
    const limit =
      limitParsed !== undefined &&
      Number.isFinite(limitParsed) &&
      limitParsed > 0
        ? Math.floor(limitParsed)
        : undefined;
    const includeAuctions = searchParams.get("includeAuctions") === "true";
    const hint = searchParams.get("hint") || undefined;

    const bundle = await AqarOfflineCacheService.getOrBuildBundle({
      city,
      intent: intent || undefined,
      limit,
      includeAuctions,
      cacheHint: hint,
      orgId: user?.orgId,
    });

    return NextResponse.json({ ...bundle, correlationId });
  } catch (error) {
    logger.error("AQAR_OFFLINE_API_FAILED", {
      correlationId,
      error: (error as Error)?.message ?? String(error),
    });
    return NextResponse.json(
      { error: "Failed to build offline bundle", correlationId },
      { status: 500 },
    );
  }
}

/**
 * POST /api/aqar/offline
 * Sync offline data bundle (stub for mobile sync)
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "aqar:offline:post",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await getSessionUser(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Accept payload but currently just acknowledge sync
    return NextResponse.json({ success: true, message: "Offline sync acknowledged" });
  } catch (error) {
    logger.error("AQAR_OFFLINE_POST_FAILED", { error });
    return NextResponse.json(
      { error: "Failed to sync offline data" },
      { status: 500 },
    );
  }
}

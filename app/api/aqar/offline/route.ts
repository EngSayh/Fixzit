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
 * Sync offline data bundle from mobile devices
 * 
 * Accepts offline changes made on mobile and reconciles with server state.
 * Supports:
 * - Favorite listings sync
 * - Search history sync
 * - Viewed listings sync
 * - Draft inquiries sync
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "aqar:offline:post",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const correlationId = crypto.randomUUID();

  try {
    const session = await getSessionUser(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate sync payload
    const payload = await request.json();
    
    // Validate payload structure
    if (!payload || typeof payload !== "object") {
      return NextResponse.json(
        { error: "Invalid sync payload", correlationId },
        { status: 400 },
      );
    }

    const syncResult = await AqarOfflineCacheService.syncOfflineChanges({
      userId: session.id,
      orgId: session.orgId,
      favorites: Array.isArray(payload.favorites) ? payload.favorites : [],
      searchHistory: Array.isArray(payload.searchHistory) ? payload.searchHistory : [],
      viewedListings: Array.isArray(payload.viewedListings) ? payload.viewedListings : [],
      draftInquiries: Array.isArray(payload.draftInquiries) ? payload.draftInquiries : [],
      lastSyncTimestamp: payload.lastSyncTimestamp,
      deviceId: payload.deviceId,
    });

    logger.info("AQAR_OFFLINE_SYNC_SUCCESS", {
      correlationId,
      userId: session.id,
      syncedCounts: {
        favorites: syncResult.favorites?.synced ?? 0,
        searchHistory: syncResult.searchHistory?.synced ?? 0,
        viewedListings: syncResult.viewedListings?.synced ?? 0,
        draftInquiries: syncResult.draftInquiries?.synced ?? 0,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Offline sync completed",
      correlationId,
      syncResult,
      serverTimestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("AQAR_OFFLINE_POST_FAILED", { error, correlationId });
    return NextResponse.json(
      { error: "Failed to sync offline data", correlationId },
      { status: 500 },
    );
  }
}

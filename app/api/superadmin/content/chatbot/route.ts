/**
 * @fileoverview Superadmin Chatbot Settings API
 * @description Chatbot configuration management (placeholder)
 * @route GET /api/superadmin/content/chatbot
 * @route PUT /api/superadmin/content/chatbot
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/content/chatbot
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { parseBodySafe } from "@/lib/api/parse-body";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

// Prevent prerendering/export of this API route
export const dynamic = "force-dynamic";

// Response headers
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

/**
 * GET /api/superadmin/content/chatbot
 * Get chatbot configuration (placeholder)
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-content-chatbot:get",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    // TODO: Implement ChatbotSettings model and fetch from database
    return NextResponse.json(
      {
        settings: {
          enabled: false,
          provider: "none",
          welcomeMessage: "",
          welcomeMessageAr: "",
        },
        message: "Chatbot settings feature pending - model not yet implemented",
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Content:Chatbot] Failed to load settings", { error });
    return NextResponse.json(
      { error: "Failed to load chatbot settings" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * PUT /api/superadmin/content/chatbot
 * Update chatbot configuration (placeholder)
 */
export async function PUT(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-content-chatbot:put",
    requests: 20,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    const { data: body, error: parseError } = await parseBodySafe<{
      enabled?: boolean;
      provider?: string;
      welcomeMessage?: string;
      welcomeMessageAr?: string;
    }>(request, { logPrefix: "[superadmin:content:chatbot]" });

    if (parseError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    logger.info("[Superadmin:Content:Chatbot] Settings update requested (not persisted)", {
      enabled: body?.enabled,
      by: session.username,
    });

    return NextResponse.json(
      {
        message: "Chatbot settings feature pending - model not yet implemented",
        acknowledged: true,
      },
      { status: 202, headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Content:Chatbot] Failed to update settings", { error });
    return NextResponse.json(
      { error: "Failed to update chatbot settings" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

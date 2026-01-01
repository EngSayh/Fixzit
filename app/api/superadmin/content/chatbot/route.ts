/**
 * @fileoverview Superadmin Chatbot Settings API
 * @description Manage AI chatbot configuration
 * @route GET, PUT /api/superadmin/content/chatbot
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/content/chatbot
 * @security API keys are encrypted at rest, never returned in responses
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { connectDb } from "@/lib/mongodb-unified";
import { ChatbotSettings } from "@/server/models/ChatbotSettings";
import { parseBodySafe } from "@/lib/api/parse-body";
import { z } from "zod";
import { BRAND_COLORS } from "@/lib/config/brand-colors";

export const dynamic = "force-dynamic";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

const ChatbotSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  provider: z.enum(["internal", "openai", "anthropic", "custom"]).optional(),
  newApiKey: z.string().optional(),
  model: z.string().optional(),
  welcomeMessage: z.string().max(500).optional(),
  welcomeMessageAr: z.string().max(500).optional(),
  position: z.enum(["bottom-right", "bottom-left"]).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  offlineMessage: z.string().max(500).optional(),
  maxTokens: z.number().min(100).max(4000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  systemPrompt: z.string().max(2000).optional(),
});

const DEFAULT_SETTINGS = {
  enabled: true,
  provider: "internal" as const,
  welcomeMessage: "Hello! How can I help you today?",
  welcomeMessageAr: "مرحباً! كيف يمكنني مساعدتك اليوم؟",
  position: "bottom-right" as const,
  primaryColor: BRAND_COLORS.primary,
  offlineMessage: "We're currently offline. Please leave a message.",
  maxTokens: 1000,
  temperature: 0.7,
  systemPrompt: "You are a helpful customer support assistant for Fixzit.",
};

/**
 * GET /api/superadmin/content/chatbot
 * Retrieve chatbot settings (API key never returned, only hasApiKey flag)
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-chatbot:get",
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

    await connectDb();
    // eslint-disable-next-line local/require-tenant-scope -- SUPER_ADMIN: Platform-wide settings singleton
    const settings = await ChatbotSettings.findOne({}).lean();

    if (!settings) {
      return NextResponse.json(
        { settings: { ...DEFAULT_SETTINGS, hasApiKey: false } },
        { headers: ROBOTS_HEADER }
      );
    }

    const { apiKey, ...safeSettings } = settings;
    return NextResponse.json(
      { settings: { ...safeSettings, hasApiKey: !!apiKey } },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Chatbot] Failed to fetch settings", { error });
    return NextResponse.json(
      { error: "Failed to fetch chatbot settings" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * PUT /api/superadmin/content/chatbot
 * Update chatbot settings (upsert pattern)
 */
export async function PUT(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-chatbot:put",
    requests: 10,
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

    const { data: body, error: parseError } = await parseBodySafe(request);
    if (parseError || !body) {
      return NextResponse.json(
        { error: parseError || "Invalid JSON body" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const validation = ChatbotSettingsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    const { newApiKey, ...updateData } = validation.data;
    const updates: Record<string, unknown> = { ...updateData };
    
    // Handle API key updates: undefined = no change, empty string or null = clear key
    if (newApiKey !== undefined) {
      updates.apiKey = newApiKey === "" ? null : newApiKey;
    }

    // eslint-disable-next-line local/require-tenant-scope -- SUPER_ADMIN: Platform-wide settings singleton
    const settings = await ChatbotSettings.findOneAndUpdate(
      {},
      { $set: updates },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    if (!settings) {
      logger.error("[Superadmin:Chatbot] Failed to create/update settings");
      return NextResponse.json(
        { error: "Failed to update chatbot settings" },
        { status: 500, headers: ROBOTS_HEADER }
      );
    }

    logger.info("[Superadmin:Chatbot] Settings updated", {
      updates: Object.keys(updates).filter(k => k !== "apiKey"),
      apiKeyChanged: newApiKey !== undefined,
      by: session.username,
    });

    const { apiKey, ...safeSettings } = settings;
    return NextResponse.json(
      { settings: { ...safeSettings, hasApiKey: !!apiKey }, message: "Chatbot settings updated" },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Chatbot] Failed to update settings", { error });
    return NextResponse.json(
      { error: "Failed to update chatbot settings" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

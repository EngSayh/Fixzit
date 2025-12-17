/**
 * @description Manages SMS provider settings and configuration.
 * GET retrieves current Taqnyat SMS settings (global or org-specific).
 * PUT updates SMS configuration including sender name and rate limits.
 * @route GET /api/admin/sms/settings
 * @route PUT /api/admin/sms/settings
 * @access Private - SUPER_ADMIN only
 * @param {string} orgId - Organization ID for org-specific settings (optional, defaults to global)
 * @returns {Object} settings: { senderName, rateLimit, enabled, lastUpdated }
 * @throws {401} If not authenticated
 * @throws {403} If not SUPER_ADMIN
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { SMSSettings } from "@/server/models/SMSSettings";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { parseBodySafe } from "@/lib/api/parse-body";
import { validatePublicHttpsUrl } from "@/lib/security/validate-public-https-url";

export async function GET(request: NextRequest) {
  // Rate limiting: 30 requests per minute for admin reads
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "admin-sms:get",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const { searchParams } = request.nextUrl;
    const orgId = searchParams.get("orgId");

    // Ensure global settings exist
    await SMSSettings.ensureGlobalSettings();

    // Get effective settings (merged with global)
    const effectiveSettings = await SMSSettings.getEffectiveSettings(orgId || undefined);

    // Also get raw settings for the requested scope
    const rawSettings = orgId
      ? await SMSSettings.getOrgSettings(orgId)
      : await SMSSettings.getGlobalSettings();

    return NextResponse.json({
      effective: effectiveSettings,
      raw: rawSettings,
      isGlobal: !orgId,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[Admin SMS Settings] GET failed", { error: errorMessage });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/sms/settings
 *
 * Update SMS settings (Super Admin only)
 */
const SLAConfigSchema = z.object({
  type: z.enum(["OTP", "NOTIFICATION", "ALERT", "MARKETING", "TRANSACTIONAL"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]),
  targetDeliveryMs: z.number().min(1000).max(86400000),
  maxRetries: z.number().min(0).max(10),
  expiresAfterMs: z.number().min(60000).max(604800000), // 1 min to 7 days
});

const ProviderConfigSchema = z.object({
  // TAQNYAT is the ONLY supported production SMS provider (CITC-compliant for Saudi Arabia)
  // LOCAL is for development/testing only
  provider: z.enum(["TAQNYAT", "LOCAL"]),
  enabled: z.boolean(),
  priority: z.number().min(1).max(10),
  accountId: z.string().optional(),
  fromNumber: z.string().optional(),
  region: z.string().optional(),
  rateLimit: z.number().optional(),
  costPerMessage: z.number().optional(),
  supportedTypes: z.array(z.enum(["OTP", "NOTIFICATION", "ALERT", "MARKETING", "TRANSACTIONAL"])).optional(),
});

const UpdateSettingsSchema = z.object({
  orgId: z.string().optional(), // null = global settings
  slaConfigs: z.array(SLAConfigSchema).optional(),
  providers: z.array(ProviderConfigSchema).optional(),
  defaultProvider: z.enum(["TAQNYAT", "LOCAL"]).optional(),
  defaultMaxRetries: z.number().min(0).max(10).optional(),
  defaultExpiresAfterMs: z.number().min(60000).max(604800000).optional(),
  globalRateLimitPerMinute: z.number().min(1).max(1000).optional(),
  globalRateLimitPerHour: z.number().min(1).max(10000).optional(),
  slaBreachNotifyEmails: z.array(z.string().email()).optional(),
  slaBreachNotifyWebhook: z
    .string()
    .url()
    .refine(
      (url) => {
        if (!url) return true; // allow empty
        try {
          validatePublicHttpsUrl(url);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Webhook URL must be a public HTTPS URL (no localhost/private IPs)" }
    )
    .optional()
    .nullable(),
  dailyReportEnabled: z.boolean().optional(),
  dailyReportEmails: z.array(z.string().email()).optional(),
  queueEnabled: z.boolean().optional(),
  retryEnabled: z.boolean().optional(),
  deliveryWebhookEnabled: z.boolean().optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const { data: body, error: parseError } = await parseBodySafe<z.infer<typeof UpdateSettingsSchema>>(request);
    if (parseError || !body) {
      return NextResponse.json(
        { error: parseError || "Invalid JSON body" },
        { status: 400 },
      );
    }
    const parsed = UpdateSettingsSchema.safeParse(body);

    if (!parsed.success) {
      const details = parsed.error.flatten();
      const webhookError =
        details.fieldErrors?.slaBreachNotifyWebhook?.[0];
      const message = webhookError || "Invalid request";
      return NextResponse.json(
        { error: message, details },
        { status: 400 }
      );
    }

    const { orgId, ...updates } = parsed.data;

    // SSRF protection for webhook
    if (updates.slaBreachNotifyWebhook) {
      try {
        validatePublicHttpsUrl(updates.slaBreachNotifyWebhook);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Invalid webhook URL";
        logger.warn("[Admin SMS Settings] Invalid webhook URL", {
          error: message,
        });
        return NextResponse.json(
          { error: message, field: "slaBreachNotifyWebhook" },
          { status: 400 }
        );
      }
    }

    // Determine if updating global or org-specific settings
    const isGlobal = !orgId;

    // Use findOneAndUpdate with upsert for atomic operation
    const filter = isGlobal ? { isGlobal: true } : { orgId };
    
    // Build update document
    const updateFields: Record<string, unknown> = {
      ...updates,
      updatedBy: session.user.email,
    };

    // Handle nullable webhook
    if (updates.slaBreachNotifyWebhook === null) {
      updateFields.slaBreachNotifyWebhook = undefined;
    }

    // Set isGlobal if creating global settings
    if (isGlobal) {
      updateFields.isGlobal = true;
    }

    const settings = await SMSSettings.findOneAndUpdate(
      filter,
      { $set: updateFields },
      { new: true, upsert: true }
    );

    logger.info("[Admin SMS Settings] Updated", {
      isGlobal,
      orgId,
      by: session.user.email,
      updates: Object.keys(updates),
    });

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[Admin SMS Settings] PUT failed", { error: errorMessage });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/sms/settings
 *
 * Delete org-specific settings (falls back to global) (Super Admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const { searchParams } = request.nextUrl;
    const orgId = searchParams.get("orgId");

    if (!orgId) {
      return NextResponse.json(
        { error: "Cannot delete global settings. Use PUT to reset values." },
        { status: 400 }
      );
    }

    const result = await SMSSettings.deleteOne({ orgId, isGlobal: false });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Org settings not found" },
        { status: 404 }
      );
    }

    logger.info("[Admin SMS Settings] Deleted org settings", {
      orgId,
      by: session.user.email,
    });

    return NextResponse.json({
      success: true,
      message: "Org settings deleted, will use global defaults",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[Admin SMS Settings] DELETE failed", { error: errorMessage });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

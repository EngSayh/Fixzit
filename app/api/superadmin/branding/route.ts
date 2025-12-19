/**
 * @fileoverview Superadmin Branding Settings API
 * @description GET/PATCH endpoints for platform-wide branding configuration
 * @route GET /api/superadmin/branding - Get current platform branding
 * @route PATCH /api/superadmin/branding - Update platform branding (superadmin only)
 * @access Superadmin only
 * @module api/superadmin/branding
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { PlatformSettings } from "@/server/models/PlatformSettings";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { revalidatePath } from "next/cache";
import { validatePublicHttpsUrl } from "@/lib/security/validate-public-https-url";
import { z } from "zod";
import { audit } from "@/lib/audit";

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

const BrandingUpdateSchema = z.object({
  logoUrl: z.string().url().optional(),
  logoStorageKey: z.string().optional(),
  logoFileName: z.string().optional(),
  logoMimeType: z.string().optional(), // Relax validation - allow any string
  logoFileSize: z
    .number()
    .int()
    .positive()
    .max(2_000_000, "Logo file size must be <= 2MB")
    .optional(),
  faviconUrl: z.string().url().optional(),
  brandName: z.string().min(1).max(100).optional(),
  brandColor: z
    .string()
    .regex(HEX_COLOR_REGEX, "brandColor must be a valid hex color (e.g. #0061A8)")
    .optional(),
  orgId: z.string().min(1).optional(), // Target tenant (superadmin can update specific org branding)
});

type BrandingUpdatePayload = z.infer<typeof BrandingUpdateSchema>;

/**
 * GET /api/superadmin/branding
 * Retrieve current platform branding settings
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await enforceRateLimit(request, {
    requests: 60,
    windowMs: 60_000,
    keyPrefix: "superadmin:branding:get",
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401 },
      );
    }
    const username = session.username ?? "superadmin";

    await connectDb();

    // Get default platform settings (no orgId = global)
    let settings = await (/* SUPER_ADMIN */ PlatformSettings.findOne({ orgId: { $exists: false } }));

    // If no settings exist, create default
    if (!settings) {
      settings = await PlatformSettings.create({
        logoUrl: "/img/fixzit-logo.png",
        brandName: "Fixzit Enterprise",
        brandColor: "#0061A8",
        // createdBy/updatedBy are set by auditPlugin
      });
      logger.info("Created default platform settings", { username });
    }

    return NextResponse.json({
      success: true,
      data: {
        logoUrl: settings.logoUrl,
        logoStorageKey: settings.logoStorageKey,
        logoFileName: settings.logoFileName,
        logoMimeType: settings.logoMimeType,
        logoFileSize: settings.logoFileSize,
        faviconUrl: settings.faviconUrl,
        brandName: settings.brandName,
        brandColor: settings.brandColor,
        updatedAt: settings.updatedAt,
        updatedBy: (settings as any).updatedBy || "system",
      },
    });
  } catch (error) {
    logger.error("Failed to fetch platform branding", { error });
    return NextResponse.json(
      { error: "Failed to fetch branding settings" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/superadmin/branding
 * Update platform branding settings (superadmin only)
 */
export async function PATCH(request: NextRequest) {
  const rateLimitResponse = await enforceRateLimit(request, {
    requests: 10,
    windowMs: 60_000,
    keyPrefix: "superadmin:branding:patch",
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Verify superadmin session
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401 }
      );
    }

    await connectDb();

    const sessionUsername = session.username ?? "superadmin";
    const sessionRole = session.role;
    const sessionOrgId = session.orgId;

    // Parse and validate request body
    let rawBody: Record<string, unknown>;
    try {
      rawBody = await request.json();
    } catch (parseError) {
      logger.warn("Failed to parse JSON body", { error: parseError });
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    let body: BrandingUpdatePayload;
    try {
      body = BrandingUpdateSchema.parse(rawBody);
    } catch (validationError) {
      logger.warn("Invalid branding update payload", { error: validationError });
      
      // Extract Zod error messages
      if (validationError instanceof z.ZodError) {
        const firstError = validationError.issues[0];
        return NextResponse.json(
          { 
            error: firstError?.message || "Invalid payload",
            field: firstError?.path?.join('.') || 'unknown',
            details: validationError.issues
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: "Invalid payload", details: validationError },
        { status: 400 }
      );
    }

    // SSRF Protection: Validate URLs after Zod parse
    let currentField: "logoUrl" | "faviconUrl" | null = null;
    try {
      if (body.logoUrl) {
        currentField = "logoUrl";
        await validatePublicHttpsUrl(body.logoUrl);
      }
      if (body.faviconUrl) {
        currentField = "faviconUrl";
        await validatePublicHttpsUrl(body.faviconUrl);
      }
    } catch (urlValidationError) {
      logger.warn("URL validation failed", { error: urlValidationError });
      return NextResponse.json(
        { 
          error: urlValidationError instanceof Error ? urlValidationError.message : "URL validation failed",
          field: currentField ?? "unknown"
        },
        { status: 400 }
      );
    }

    // Extract orgId if provided (superadmin can target specific tenant)
    const { orgId, ...updates } = body;

    // Build query: global settings (no orgId) or specific org
    const query = orgId ? { orgId } : { orgId: { $exists: false } };

    // Update or create settings
    const settings = await PlatformSettings.findOneAndUpdate(
      query,
      {
        $set: {
          ...updates,
          // updatedBy and updatedAt are handled by auditPlugin and timestamps
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    const safeSettings =
      settings ??
      {
        logoUrl: updates.logoUrl ?? "/img/fixzit-logo.png",
        logoStorageKey: updates.logoStorageKey,
        logoFileName: updates.logoFileName,
        logoMimeType: updates.logoMimeType,
        logoFileSize: updates.logoFileSize,
        faviconUrl: updates.faviconUrl,
        brandName: updates.brandName ?? "Fixzit Enterprise",
        brandColor: updates.brandColor ?? "#0061A8",
        updatedAt: new Date(),
        updatedBy: sessionUsername,
      };

    logger.info("Platform branding updated", {
      username: sessionUsername,
      orgId: orgId || "global",
      fields: Object.keys(updates),
    });

    // Invalidate cached branding across the app
    try {
      revalidatePath("/", "layout");
      revalidatePath("/superadmin", "layout");
      
      // Also invalidate org settings API cache if tenant-specific
      if (orgId) {
        revalidatePath("/api/organization/settings");
      }
    } catch (revalidateError) {
      logger.warn("Branding revalidate skipped", { error: revalidateError });
    }

    const response = NextResponse.json({
      success: true,
      data: {
        logoUrl: safeSettings.logoUrl,
        logoStorageKey: safeSettings.logoStorageKey,
        logoFileName: safeSettings.logoFileName,
        logoMimeType: safeSettings.logoMimeType,
        logoFileSize: safeSettings.logoFileSize,
        faviconUrl: safeSettings.faviconUrl,
        brandName: safeSettings.brandName,
        brandColor: safeSettings.brandColor,
        updatedAt: safeSettings.updatedAt,
        updatedBy: (safeSettings as any).updatedBy || sessionUsername,
      },
      message: "Branding settings updated successfully",
    });

    // Fire-and-forget audit entry
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    void audit({
      actorId: sessionUsername,
      actorEmail: sessionUsername,
      actorRole: sessionRole,
      action: "superadmin.branding.update",
      target: orgId || "global",
      targetType: "branding",
      orgId: sessionOrgId,
      ipAddress: clientIp,
      success: true,
      meta: {
        fields: Object.keys(updates),
      },
    }).catch((auditError) => {
      logger.warn("Branding audit failed", { error: auditError });
    });

    return response;
  } catch (error) {
    logger.error("Failed to update platform branding", { error });
    return NextResponse.json(
      { error: "Failed to update branding settings" },
      { status: 500 }
    );
  }
}

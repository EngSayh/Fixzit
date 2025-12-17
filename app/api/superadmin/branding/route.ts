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
import { z } from "zod";

const BrandingUpdateSchema = z.object({
  logoUrl: z.string().url().optional(),
  logoStorageKey: z.string().optional(),
  logoFileName: z.string().optional(),
  logoMimeType: z.string().regex(/^image\/(png|svg\+xml|webp|jpeg)$/).optional(),
  logoFileSize: z.number().int().positive().max(2_097_152).optional(), // 2MB max
  faviconUrl: z.string().url().optional(),
  brandName: z.string().min(1).max(100).optional(),
  brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  orgId: z.string().min(1).optional(), // Target tenant (superadmin can update specific org branding)
});

type BrandingUpdatePayload = z.infer<typeof BrandingUpdateSchema>;

/**
 * GET /api/superadmin/branding
 * Retrieve current platform branding settings
 */
export async function GET(request: NextRequest) {
  enforceRateLimit(request, {
    requests: 60,
    windowMs: 60_000,
    keyPrefix: "superadmin:branding:get",
  });

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

    // Get default platform settings (no orgId = global)
    let settings = await PlatformSettings.findOne({ orgId: { $exists: false } });

    // If no settings exist, create default
    if (!settings) {
      settings = await PlatformSettings.create({
        logoUrl: "/img/fixzit-logo.png",
        brandName: "Fixzit Enterprise",
        brandColor: "#0061A8",
        // createdBy/updatedBy are set by auditPlugin
      });
      logger.info("Created default platform settings", { username: session.username });
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
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/superadmin/branding
 * Update platform branding settings (superadmin only)
 */
export async function PATCH(request: NextRequest) {
  enforceRateLimit(request, {
    requests: 10,
    windowMs: 60_000,
    keyPrefix: "superadmin:branding:patch",
  });

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

    // Parse and validate request body
    let body: BrandingUpdatePayload;
    try {
      const rawBody = await request.json();
      body = BrandingUpdateSchema.parse(rawBody);
    } catch (validationError) {
      logger.warn("Invalid branding update payload", { error: validationError });
      return NextResponse.json(
        { error: "Invalid payload", details: validationError },
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

    logger.info("Platform branding updated", {
      username: session.username,
      orgId: orgId || "global",
      fields: Object.keys(updates),
    });

    // Invalidate cached branding across the app
    revalidatePath("/", "layout");
    revalidatePath("/superadmin", "layout");
    
    // Also invalidate org settings API cache if tenant-specific
    if (orgId) {
      revalidatePath("/api/organization/settings");
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
        updatedBy: (settings as any).updatedBy || session.username,
      },
      message: "Branding settings updated successfully",
    });
  } catch (error) {
    logger.error("Failed to update platform branding", { error });
    return NextResponse.json(
      { error: "Failed to update branding settings" },
      { status: 500 }
    );
  }
}

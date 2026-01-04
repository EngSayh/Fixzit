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
import { setTenantContext, clearTenantContext } from "@/server/plugins/tenantIsolation";
import { setAuditContext, clearAuditContext } from "@/server/plugins/auditPlugin";
import { z } from "zod";
import { BRAND_COLORS } from "@/lib/config/brand-colors";

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
const isAbsoluteUrl = (value: string) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const UrlOrPathSchema = z
  .string()
  .min(1)
  .refine(
    (value) => value.startsWith("/") || isAbsoluteUrl(value),
    "Must be a valid URL or relative path",
  );

const BrandingUpdateSchema = z.object({
  logoUrl: UrlOrPathSchema.optional(),
  logoStorageKey: z.string().optional(),
  logoFileName: z.string().optional(),
  logoMimeType: z.string().optional(), // Relax validation - allow any string
  logoFileSize: z
    .number()
    .int()
    .positive()
    .max(2_000_000, "Logo file size must be <= 2MB")
    .optional(),
  faviconUrl: UrlOrPathSchema.optional(),
  brandName: z.string().min(1).max(100).optional(),
  brandColor: z
    .string()
    .regex(HEX_COLOR_REGEX, `brandColor must be a valid hex color (e.g. ${BRAND_COLORS.primary})`)
    .optional(),
  orgId: z.string().min(1).optional(), // Target tenant (superadmin can update specific org branding)
});

type BrandingUpdatePayload = z.infer<typeof BrandingUpdateSchema>;

/** Extended type including audit plugin fields */
type PlatformSettingsWithAudit = {
  logoUrl?: string;
  logoStorageKey?: string;
  logoFileName?: string;
  logoMimeType?: string;
  logoFileSize?: number;
  faviconUrl?: string;
  brandName?: string;
  brandColor?: string;
  updatedAt?: Date;
  updatedBy?: string;
  createdBy?: string;
};

/**
 * GET /api/superadmin/branding
 * Retrieve current platform branding settings
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    requests: 60,
    windowMs: 60_000,
    keyPrefix: "superadmin:branding:get",
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

    // Use a superadmin context without forcing an orgId (global settings)
    setTenantContext({
      orgId: undefined,
      isSuperAdmin: true,
      userId: session.username,
      assumedOrgId: "global",
      skipTenantFilter: true,
    });
    
    // Set audit context for platform operations (createdBy is optional for PlatformSettings)
    // Note: superadmin sessions don't have a MongoDB userId, just a username
    // The auditPlugin will skip setting createdBy/updatedBy since the userId is not a valid ObjectId
    setAuditContext({
      userId: undefined, // superadmin has no MongoDB user ID
      userEmail: session.username,
    });

    try {
      // Get or create default platform settings (no orgId = global)
      const settings = await PlatformSettings.findOneAndUpdate(
        { orgId: { $exists: false } },
        {
          $setOnInsert: {
            logoUrl: "/img/fixzit-logo.png",
            brandName: "Fixzit Enterprise",
            brandColor: BRAND_COLORS.primary,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      );

      const settingsWithAudit = settings as unknown as PlatformSettingsWithAudit;
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
          updatedBy: settingsWithAudit.updatedBy || "system",
        },
      });
    } finally {
      clearTenantContext();
      clearAuditContext();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error("Failed to fetch platform branding", { 
      error: errorMessage, 
      stack: errorStack,
      errorType: error?.constructor?.name,
    });
    return NextResponse.json(
      { 
        error: "Failed to fetch branding settings",
        // Include details in development for debugging
        ...(process.env.NODE_ENV === 'development' && { details: errorMessage }),
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/superadmin/branding
 * Update platform branding settings (superadmin only)
 */
export async function PATCH(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
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

    // Use a superadmin context without forcing an orgId (global settings)
    setTenantContext({
      orgId: undefined,
      isSuperAdmin: true,
      userId: session.username,
      assumedOrgId: "global",
      skipTenantFilter: true,
    });
    
    // Set audit context for platform operations
    // Note: superadmin sessions don't have a MongoDB userId, just a username
    setAuditContext({
      userId: undefined, // superadmin has no MongoDB user ID
      userEmail: session.username,
    });

    try {
      // Parse and validate request body
    let rawBody: any;
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
    const isRelativeUrl = (value: string) => value.startsWith("/");
    let currentField: "logoUrl" | "faviconUrl" | null = null;
    try {
      if (body.logoUrl && !isRelativeUrl(body.logoUrl)) {
        currentField = "logoUrl";
        await validatePublicHttpsUrl(body.logoUrl);
      }
      if (body.faviconUrl && !isRelativeUrl(body.faviconUrl)) {
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

    // Null check: findOneAndUpdate can return null if the document wasn't found/created
    if (!settings) {
      logger.error("Branding settings not found after upsert", {
        username: session.username,
        orgId: orgId || "global",
      });
      return NextResponse.json(
        { success: false, message: "Branding settings not found" },
        { status: 404 }
      );
    }

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

    const settingsWithAudit = settings as unknown as PlatformSettingsWithAudit;
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
          updatedBy: settingsWithAudit.updatedBy || session.username,
        },
        message: "Branding settings updated successfully",
      });
    } finally {
      clearTenantContext();
      clearAuditContext();
    }
  } catch (error) {
    logger.error("Failed to update platform branding", { error });
    return NextResponse.json(
      { error: "Failed to update branding settings" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { connectDb } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { validatePublicHttpsUrl } from "@/lib/security/validate-public-https-url";
import { PlatformSettings } from "@/server/models/PlatformSettings";

export const runtime = "nodejs";

/**
 * GET /api/superadmin/settings/logo
 * Returns current platform logo settings
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized: Superadmin session required" },
        { status: 401 },
      );
    }

    await connectDb();

    const settings = await PlatformSettings.findOne({ orgId: session.orgId });

    return NextResponse.json({
      logoUrl: settings?.logoUrl || null,
      brandName: settings?.brandName || "Fixzit Enterprise",
      brandColor: settings?.brandColor || "#0061A8",
    });
  } catch (error) {
    logger.error("[Superadmin Logo API] GET failed", { error });
    return NextResponse.json(
      { error: "Failed to fetch logo settings" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/superadmin/settings/logo
 * Upload new platform logo (multipart/form-data)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized: Superadmin session required" },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const logoFile = formData.get("logo") as File | null;

    if (!logoFile) {
      return NextResponse.json(
        { error: "No logo file provided" },
        { status: 400 },
      );
    }

    // Validate file type
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/svg+xml",
      "image/webp",
    ];
    if (!allowedTypes.includes(logoFile.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PNG, JPEG, SVG, or WebP allowed" },
        { status: 400 },
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (logoFile.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size: 5MB" },
        { status: 400 },
      );
    }

    await connectDb();

    // TODO: Implement cloud storage upload (S3/R2/etc)
    // For now, store as data URL (production should use cloud storage)
    const arrayBuffer = await logoFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${logoFile.type};base64,${base64}`;

    // Update or create PlatformSettings
    const settings = await PlatformSettings.findOneAndUpdate(
      { orgId: session.orgId },
      {
        logoUrl: dataUrl,
        logoFileName: logoFile.name,
        logoMimeType: logoFile.type,
        logoFileSize: logoFile.size,
        updatedBy: session.username,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    logger.info("[Superadmin Logo API] Logo uploaded", {
      username: session.username,
      fileName: logoFile.name,
      fileSize: logoFile.size,
    });

    return NextResponse.json({
      success: true,
      data: {
        logoUrl: settings.logoUrl,
      },
    });
  } catch (error) {
    logger.error("[Superadmin Logo API] POST failed", { error });
    return NextResponse.json(
      { error: "Failed to upload logo" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/superadmin/settings/logo
 * Update logo URL (for external URLs with SSRF protection)
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized: Superadmin session required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { logoUrl } = body;

    if (!logoUrl) {
      return NextResponse.json(
        { error: "logoUrl is required" },
        { status: 400 },
      );
    }

    // SSRF validation for external URLs
    const validation = validatePublicHttpsUrl(logoUrl);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 },
      );
    }

    await connectDb();

    const settings = await PlatformSettings.findOneAndUpdate(
      { orgId: session.orgId },
      {
        logoUrl: validation.normalizedUrl,
        updatedBy: session.username,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    logger.info("[Superadmin Logo API] Logo URL updated", {
      username: session.username,
      logoUrl: validation.normalizedUrl,
    });

    return NextResponse.json({
      success: true,
      data: {
        logoUrl: settings.logoUrl,
      },
    });
  } catch (error) {
    logger.error("[Superadmin Logo API] PATCH failed", { error });
    return NextResponse.json(
      { error: "Failed to update logo URL" },
      { status: 500 },
    );
  }
}

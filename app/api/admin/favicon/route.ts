/**
 * @description Uploads platform favicon for browser tab branding.
 * Accepts PNG, ICO, or SVG images up to 1MB. PNG files are automatically
 * converted to ICO format using ImageMagick. Favicon is placed in public/
 * for Next.js auto-serving.
 * @route POST /api/admin/favicon
 * @access Private - SUPER_ADMIN only
 * @param {FormData} body - favicon file (multipart/form-data)
 * @returns {Object} success: true, faviconUrl: string
 * @throws {401} If not authenticated
 * @throws {403} If not SUPER_ADMIN
 * @throws {400} If file type invalid or size exceeds limit
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { PlatformSettings } from "@/server/models/PlatformSettings";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { writeFile, mkdir, copyFile, unlink } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { logger } from "@/lib/logger";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface PlatformSettingsDocument {
  faviconUrl?: string;
  faviconFileName?: string;
  faviconFileSize?: number;
  faviconMimeType?: string;
  updatedAt?: Date;
  [key: string]: unknown;
}

/**
 * Uploads and sets a new favicon for the platform
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "admin-favicon:upload",
    requests: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Authentication & Authorization
    const user = await getSessionUser(request);

    // SUPER_ADMIN only
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - SUPER_ADMIN access required" },
        { status: 403 },
      );
    }

    await connectToDatabase();

    // Parse multipart form data
    const formData = await request.formData();
    const faviconFile = formData.get("favicon") as File | null;

    if (!faviconFile) {
      return NextResponse.json(
        { error: "No favicon file provided" },
        { status: 400 },
      );
    }

    // Validate file type
    const allowedTypes = [
      "image/png",
      "image/x-icon",
      "image/vnd.microsoft.icon",
      "image/ico",
      "image/svg+xml",
    ];
    if (!allowedTypes.includes(faviconFile.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PNG, ICO, SVG" },
        { status: 400 },
      );
    }

    // Validate file size (1MB max for favicon)
    const maxSize = 1 * 1024 * 1024; // 1MB
    if (faviconFile.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size: 1MB for favicons" },
        { status: 400 },
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    // Sanitize extension to prevent path traversal (security fix from PR #416 feedback)
    const rawExtension = faviconFile.name.split(".").pop()?.toLowerCase() || "png";
    const allowedExtensions = ["png", "ico", "svg", "jpg", "jpeg", "gif", "webp"];
    const extension = allowedExtensions.includes(rawExtension) ? rawExtension : "png";
    const tempFileName = `favicon-${timestamp}.${extension}`;

    // Define storage paths
    const uploadDir = path.join(process.cwd(), "public", "uploads", "favicons");
    const tempFilePath = path.join(uploadDir, tempFileName);
    const finalFaviconPath = path.join(process.cwd(), "public", "favicon.ico");

    // Create directory if it doesn't exist
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Convert File to Buffer and save temporarily
    const bytes = await faviconFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(tempFilePath, buffer);

    let faviconUrl = "/favicon.ico";

    // If PNG, convert to ICO format using ImageMagick
    if (faviconFile.type === "image/png") {
      try {
        // Try to use ImageMagick to convert PNG to ICO (multiple sizes)
        await execAsync(
          `magick "${tempFilePath}" -resize 32x32 -background none -gravity center -extent 32x32 "${finalFaviconPath}"`
        );
        logger.info("[Favicon] Converted PNG to ICO using ImageMagick");
      } catch {
        // If ImageMagick not available, just copy as-is and let browser handle it
        logger.warn("[Favicon] ImageMagick not available, using PNG directly");
        await copyFile(tempFilePath, finalFaviconPath);
      }
    } else if (extension === "ico") {
      // ICO file, copy directly to public/favicon.ico
      await copyFile(tempFilePath, finalFaviconPath);
    } else if (extension === "svg") {
      // SVG file, store it and reference in metadata
      const svgPath = path.join(process.cwd(), "public", `favicon-${timestamp}.svg`);
      await copyFile(tempFilePath, svgPath);
      faviconUrl = `/favicon-${timestamp}.svg`;
    }

    // Clean up temp file
    try {
      await unlink(tempFilePath);
    } catch {
      // Ignore cleanup errors
    }

    // Update or create platform settings
    const settings = await PlatformSettings.findOneAndUpdate(
      { orgId: user.orgId },
      {
        faviconUrl,
        faviconStorageKey: finalFaviconPath,
        faviconFileName: faviconFile.name,
        faviconMimeType: faviconFile.type,
        faviconFileSize: faviconFile.size,
        updatedBy: user.id,
        updatedAt: new Date(),
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      },
    );

    const settingsTyped = settings as unknown as PlatformSettingsDocument;
    return NextResponse.json({
      success: true,
      data: {
        faviconUrl: settingsTyped.faviconUrl || faviconUrl,
        fileName: settingsTyped.faviconFileName,
        fileSize: settingsTyped.faviconFileSize,
        mimeType: settingsTyped.faviconMimeType,
        updatedAt: settingsTyped.updatedAt,
      },
      message: "Favicon uploaded successfully. Changes may take a moment to appear in browser.",
    });
  } catch (error) {
    // Handle authentication errors specifically
    if (error instanceof Error && error.message.includes("No valid token")) {
      return NextResponse.json(
        { error: "Unauthorized - Authentication required" },
        { status: 401 },
      );
    }

    logger.error("[POST /api/admin/favicon] Error", error);
    return NextResponse.json(
      { error: "Failed to upload favicon" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/admin/favicon
 * Super Admin only endpoint to get current favicon settings
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication & Authorization
    const user = await getSessionUser(request);

    // SUPER_ADMIN only
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - SUPER_ADMIN access required" },
        { status: 403 },
      );
    }

    await connectToDatabase();

    const settings = (await PlatformSettings.findOne({
      orgId: user.orgId,
    })) as unknown as PlatformSettingsDocument | null;

    const faviconData = settings
      ? {
          faviconUrl: settings.faviconUrl,
          faviconFileName: settings.faviconFileName,
          faviconFileSize: settings.faviconFileSize,
          faviconMimeType: settings.faviconMimeType,
          updatedAt: settings.updatedAt,
        }
      : null;

    if (!faviconData || !faviconData.faviconUrl) {
      // Return default favicon
      return NextResponse.json({
        faviconUrl: "/favicon.ico",
        fileName: "favicon.ico (default)",
        fileSize: null,
        mimeType: "image/x-icon",
        updatedAt: null,
        isDefault: true,
      });
    }

    return NextResponse.json({
      faviconUrl: faviconData.faviconUrl,
      fileName: faviconData.faviconFileName,
      fileSize: faviconData.faviconFileSize,
      mimeType: faviconData.faviconMimeType,
      updatedAt: faviconData.updatedAt,
      isDefault: false,
    });
  } catch (error) {
    // Handle authentication errors specifically
    if (error instanceof Error && error.message.includes("No valid token")) {
      return NextResponse.json(
        { error: "Unauthorized - Authentication required" },
        { status: 401 },
      );
    }

    logger.error("[GET /api/admin/favicon] Error", error);
    return NextResponse.json(
      { error: "Failed to fetch favicon settings" },
      { status: 500 },
    );
  }
}

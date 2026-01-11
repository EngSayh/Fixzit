/**
 * @fileoverview Superadmin Branding Logo Upload
 * @description Uploads a platform logo file and updates global branding settings.
 * @route POST /api/superadmin/branding/logo
 * @access Superadmin only
 */

import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { connectDb } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { PlatformSettings } from "@/server/models/PlatformSettings";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { setTenantContext, clearTenantContext } from "@/server/plugins/tenantIsolation";
import { setAuditContext, clearAuditContext } from "@/server/plugins/auditPlugin";

const MAX_LOGO_SIZE_BYTES = 2_000_000; // 2MB
const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/svg+xml",
  "image/webp",
];

type PlatformSettingsWithAudit = {
  logoUrl?: string;
  logoFileName?: string;
  logoFileSize?: number;
  logoMimeType?: string;
  updatedAt?: Date;
  updatedBy?: string;
};

export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    requests: 10,
    windowMs: 60_000,
    keyPrefix: "superadmin:branding:logo",
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

    await connectDb();

    setTenantContext({
      orgId: undefined,
      isSuperAdmin: true,
      userId: session.username,
      assumedOrgId: "global",
      skipTenantFilter: true,
    });

    setAuditContext({
      userId: undefined,
      userEmail: session.username,
    });

    try {
      const formData = (await request.formData()) as globalThis.FormData;
      const logoFile = formData.get("logo") as File | null;

      if (!logoFile) {
        return NextResponse.json(
          { error: "No logo file provided" },
          { status: 400 },
        );
      }

      if (!ALLOWED_MIME_TYPES.includes(logoFile.type)) {
        return NextResponse.json(
          { error: `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}` },
          { status: 400 },
        );
      }

      if (logoFile.size > MAX_LOGO_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File too large. Maximum size: ${MAX_LOGO_SIZE_BYTES / (1024 * 1024)}MB` },
          { status: 400 },
        );
      }

      const timestamp = Date.now();
      const extension = path.extname(logoFile.name) || ".png";
      const fileName = `logo-${timestamp}${extension}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads", "logos");
      const filePath = path.join(uploadDir, fileName);
      const publicUrl = `/uploads/logos/${fileName}`;

      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      const bytes = await logoFile.arrayBuffer();
      await writeFile(filePath, Buffer.from(bytes));

      const settings = await PlatformSettings.findOneAndUpdate(
        { orgId: { $exists: false } },
        {
          $set: {
            logoUrl: publicUrl,
            logoStorageKey: filePath,
            logoFileName: logoFile.name,
            logoMimeType: logoFile.type,
            logoFileSize: logoFile.size,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      );

      if (!settings) {
        return NextResponse.json(
          { error: "Failed to update branding settings" },
          { status: 500 },
        );
      }

      const settingsWithAudit = settings as unknown as PlatformSettingsWithAudit;
      return NextResponse.json({
        success: true,
        data: {
          logoUrl: settings.logoUrl,
          logoFileName: settings.logoFileName,
          logoFileSize: settings.logoFileSize,
          logoMimeType: settings.logoMimeType,
          updatedAt: settings.updatedAt,
          updatedBy: settingsWithAudit.updatedBy || "system",
        },
      });
    } finally {
      clearTenantContext();
      clearAuditContext();
    }
  } catch (error) {
    logger.error("Failed to upload branding logo", error);
    return NextResponse.json(
      { error: "Failed to upload logo" },
      { status: 500 },
    );
  }
}

/**
 * @fileoverview Presigned URL API for Secure File Uploads
 * @description Generates AWS S3 presigned URLs for secure direct-to-S3 uploads
 * with file type validation, size limits, and tenant isolation.
 * 
 * @module api/upload/presigned-url
 * @requires Authenticated user with orgId
 * 
 * @endpoints
 * - POST /api/upload/presigned-url - Generate presigned PUT URL
 * 
 * @requestBody
 * - fileName: (required) Original file name
 * - contentType: (required) MIME type (application/pdf, image/png, image/jpeg)
 * - category: Upload category (kyc, resume, invoice, document)
 * 
 * @response
 * - url: Presigned PUT URL (expires in 5 minutes)
 * - key: S3 object key for reference
 * 
 * @validation
 * - Allowed types: PDF (25MB max), PNG/JPEG (10MB max)
 * - File extension must match content type
 * - Requires AV scanning if configured
 * 
 * @security
 * - Rate limited: 30 requests per minute per user/org
 * - Tenant-isolated: Files stored in org-prefixed paths
 * - Secure headers applied to response
 * - orgId required to prevent anonymous uploads
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { buildOrgAwareRateLimitKey } from "@/server/security/rateLimitKey";
import { createSecureResponse } from "@/server/security/headers";
import { getPresignedPutUrl } from "@/lib/storage/s3";
import { Config } from "@/lib/config/constants";
import { logger } from "@/lib/logger";
import { parseBodySafe } from "@/lib/api/parse-body";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
]);

const ALLOWED_EXTENSIONS = new Set(["pdf", "png", "jpg", "jpeg"]);

const MAX_SIZE_BYTES: Record<string, number> = {
  "application/pdf": 25 * 1024 * 1024, // 25MB
  "image/png": 10 * 1024 * 1024, // 10MB
  "image/jpeg": 10 * 1024 * 1024,
  "image/jpg": 10 * 1024 * 1024,
};

type PresignCategory = "kyc" | "resume" | "invoice" | "document";

function sanitizeFileName(name: string): string {
  // Remove path separators and limit to safe characters
  const sanitized = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return sanitized.slice(-128); // cap length to avoid overly long keys
}

function buildKey(
  tenantId: string | null | undefined,
  userId: string,
  category: PresignCategory,
  fileName: string,
) {
  const safeTenant = (tenantId || "global").replace(/[^a-zA-Z0-9_-]/g, "-");
  const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, "-");
  const safeFile = sanitizeFileName(fileName);
  const prefix = category || "document";
  return `${safeTenant}/${prefix}/${safeUser}/${Date.now()}-${safeFile}`;
}

export async function POST(req: NextRequest) {
  try {
    let user;
    try {
      user = await getSessionUser(req);
    } catch (error) {
      logger.error("[Presign] Auth service failure", { error });
      return createSecureResponse({ error: "Auth service unavailable" }, 503, req);
    }
    if (!user) return createSecureResponse({ error: "Unauthorized" }, 401, req);

    if (!Config.aws.s3.bucket || !Config.aws.region) {
      return createSecureResponse(
        { error: "Storage not configured" },
        500,
        req,
      );
    }
    const scanEnforced = Config.aws.scan.required;
    if (scanEnforced && !Config.aws.scan.endpoint) {
      return createSecureResponse(
        { error: "AV scanning not configured" },
        503,
        req,
      );
    }

    const { tenantId, id: userId, orgId } = user;

    // SECURITY: Require orgId for tenant-isolated rate limiting
    // Missing orgId indicates session/data issue - fail fast rather than sharing anonymous bucket
    if (!orgId) {
      logger.warn('[Presign] Missing orgId in authenticated session', { userId });
      return createSecureResponse({ error: "Missing organization context" }, 400, req);
    }

    // Rate limit to avoid abuse - tenant-isolated bucket
    const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, orgId, userId), 30, 60_000);
    if (!rl.allowed) return rateLimitError();

    const { data: body, error: parseError } = await parseBodySafe<{ fileName?: string; fileType?: string; fileSize?: number; category?: string }>(req, { logPrefix: "[upload:presigned-url]" });
    if (parseError) {
      return createSecureResponse({ error: "Invalid request body" }, 400, req);
    }
    const { fileName, fileType, fileSize, category } = body || {};

    if (!fileName || !fileType || typeof fileSize !== "number") {
      return createSecureResponse(
        { error: "Missing fileName, fileType, or fileSize" },
        400,
        req,
      );
    }

    if (!ALLOWED_TYPES.has(fileType)) {
      return createSecureResponse({ error: "Unsupported file type" }, 400, req);
    }

    const ext = fileName.split(".").pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
      return createSecureResponse(
        { error: "Unsupported file extension" },
        400,
        req,
      );
    }

    const maxSize = MAX_SIZE_BYTES[fileType] ?? 10 * 1024 * 1024;
    if (fileSize > maxSize) {
      return createSecureResponse(
        {
          error: `File too large. Max ${Math.round(maxSize / (1024 * 1024))}MB`,
        },
        400,
        req,
      );
    }

    const cat = (
      category && typeof category === "string"
        ? category
        : fileType.startsWith("image/")
          ? "document"
          : "document"
    ) as PresignCategory;

    const key = buildKey(tenantId, userId, cat, fileName);
    const { url: uploadUrl, headers: uploadHeaders } = await getPresignedPutUrl(
      key,
      fileType,
      900,
      {
        category: cat,
        user: userId,
        tenant: tenantId || "global",
      },
    ); // 15 minutes
    const expiresAt = new Date(Date.now() + 900_000).toISOString();

    // Surface metadata for downstream AV scan
    return NextResponse.json({
      uploadUrl,
      uploadHeaders,
      key,
      expiresAt,
      scanRequired: scanEnforced,
      maxSizeBytes: maxSize,
      allowedTypes: Array.from(ALLOWED_TYPES),
    });
  } catch (err) {
    logger.error("[Presign] Failed to create presigned URL", { error: err });
    return createSecureResponse({ error: "Failed to presign" }, 500, req);
  }
}

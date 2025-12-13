import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { parseBodySafe } from "@/lib/api/parse-body";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { getPresignedPutUrl, buildResumeKey } from "@/lib/storage/s3";
import { logger } from "@/lib/logger";

import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { buildOrgAwareRateLimitKey } from "@/server/security/rateLimitKey";
import { validateBucketPolicies } from "@/lib/security/s3-policy";

const ALLOWED_TYPES = new Set(["application/pdf", "application/x-pdf"]);
const ALLOWED_EXTENSIONS = new Set(["pdf"]);
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * @openapi
 * /api/files/resumes/presign:
 *   get:
 *     summary: files/resumes/presign operations
 *     tags: [files]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req).catch(() => null);
    if (user && !user.orgId) {
      logger.error("[Resumes Presign] Authenticated user missing orgId - denying to preserve tenant isolation", {
        userId: user.id,
      });
      return createSecureResponse({ error: "Missing organization context" }, 400, req);
    }
    if (!process.env.AWS_S3_BUCKET || !process.env.AWS_REGION) {
      return createSecureResponse(
        { error: "Storage not configured" },
        500,
        req,
      );
    }
    const scanEnforced = process.env.S3_SCAN_REQUIRED === "true";
    if (scanEnforced && !process.env.AV_SCAN_ENDPOINT) {
      return createSecureResponse(
        { error: "AV scanning not configured" },
        503,
        req,
      );
    }
    const policiesOk = await validateBucketPolicies();
    if (!policiesOk) {
      return createSecureResponse(
        { error: "Bucket policy/encryption invalid" },
        503,
        req,
      );
    }

    // Rate limiting: Authenticated users get tenant-isolated buckets,
    // anonymous users (careers form) share IP-based bucket with tighter limits
    const orgId = user?.orgId ?? null;
    const userId = user?.id ?? null;
    
    const rl = await smartRateLimit(
      buildOrgAwareRateLimitKey(req, orgId, userId),
      user ? 60 : 20, // tighter window for anonymous callers
      60_000,
    );
    if (!rl.allowed) {
      return rateLimitError();
    }

    const { data: body, error: parseError } = await parseBodySafe<Record<string, unknown>>(req, { logPrefix: "[files:resumes:presign]" });
    if (parseError || !body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const fileNameRaw = typeof body.fileName === "string" ? body.fileName : "";
    const contentType =
      typeof body.contentType === "string" ? body.contentType : "";
    const size =
      typeof (body as { size?: number }).size === "number"
        ? (body as { size?: number }).size
        : undefined;
    if (!fileNameRaw || !contentType)
      return NextResponse.json(
        { error: "Missing fileName or contentType" },
        { status: 400 },
      );

    const baseName = path.basename(fileNameRaw).replace(/[^\w.-]/g, "_");
    const ext = baseName.split(".").pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: "Unsupported file extension (PDF only)" },
        { status: 415 },
      );
    }
    if (!ALLOWED_TYPES.has(contentType)) {
      return NextResponse.json(
        { error: "Unsupported content type" },
        { status: 415 },
      );
    }
    if (typeof size === "number" && size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File too large (max 5MB)" },
        { status: 400 },
      );
    }

    const key = buildResumeKey(
      user?.tenantId || "public",
      `${Date.now()}-${randomUUID()}-${baseName}`,
    );
    const { url, headers } = await getPresignedPutUrl(key, contentType, 300, {
      category: "resume",
      user: user?.id || "anonymous",
      tenant: user?.tenantId || "public",
      source: user ? "hr-dashboard" : "careers-form",
    });
    return NextResponse.json({ url, key, headers, scanRequired: scanEnforced });
  } catch (err) {
    logger.error("[Resumes Presign] error", { error: err });
    return createSecureResponse({ error: "Failed to presign" }, 500, req);
  }
}

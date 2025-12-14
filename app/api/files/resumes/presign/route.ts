import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { Config } from "@/lib/config/constants";
import { parseBodySafe } from "@/lib/api/parse-body";
import { getSessionOrNull } from "@/lib/auth/safe-session";
import { getPresignedPutUrl } from "@/lib/storage/s3";
import { assertS3Configured, S3NotConfiguredError, buildS3Key } from "@/lib/storage/s3-config";
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
    const sessionResult = await getSessionOrNull(req, { route: "files:resumes:presign" });
    if (!sessionResult.ok) {
      return sessionResult.response; // 503 on infra error
    }
    const user = sessionResult.session;
    if (user && !user.orgId) {
      logger.error("[Resumes Presign] Authenticated user missing orgId - denying to preserve tenant isolation", {
        userId: user.id,
      });
      return createSecureResponse({ error: "Missing organization context" }, 400, req);
    }
    
    // Check S3 configuration
    try {
      assertS3Configured();
    } catch (error) {
      if (error instanceof S3NotConfiguredError) {
        return createSecureResponse(error.toJSON(), 501, req);
      }
      throw error;
    }
    
    const scanEnforced = Config.aws.scan.required;
    if (scanEnforced && !Config.aws.scan.endpoint) {
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

    // Build S3 key with org scoping
    const key = buildS3Key({
      orgId: user?.orgId || "public",
      module: "resumes",
      entityId: user?.id || "anonymous",
      filename: baseName,
      uuid: randomUUID(),
    });
    
    const { url, headers } = await getPresignedPutUrl(key, contentType, 300, {
      category: "resume",
      user: user?.id || "anonymous",
      tenant: user?.tenantId || "public",
      orgId: user?.orgId || "public",
      source: user ? "hr-dashboard" : "careers-form",
    });
    return NextResponse.json({ url, key, headers, scanRequired: scanEnforced });
  } catch (err) {
    logger.error("[Resumes Presign] error", { error: err });
    return createSecureResponse({ error: "Failed to presign" }, 500, req);
  }
}

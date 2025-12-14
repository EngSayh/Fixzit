/**
 * @fileoverview Work Order Attachment Presign API Route
 * @description Generate presigned S3 URLs for secure file uploads. Validates
 * file type/size, enforces AV scanning policy, and returns signed PUT URL.
 * @route POST /api/work-orders/[id]/attachments/presign - Get presigned upload URL
 * @access Protected - Requires authenticated session
 * @module work-orders
 */
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrNull } from "@/lib/auth/safe-session";
import { getPresignedPutUrl } from "@/lib/storage/s3";
import { assertS3Configured, S3NotConfiguredError, buildS3Key } from "@/lib/storage/s3-config";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { buildOrgAwareRateLimitKey } from "@/server/security/rateLimitKey";
import { createSecureResponse } from "@/server/security/headers";
import { validateBucketPolicies } from "@/lib/security/s3-policy";
import { logger } from "@/lib/logger";

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "application/pdf",
]);
const ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "pdf"]);

const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
/**
 * @openapi
 * /api/work-orders/[id]/attachments/presign:
 *   get:
 *     summary: work-orders/[id]/attachments/presign operations
 *     tags: [work-orders]
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
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const sessionResult = await getSessionOrNull(req, { route: "work-orders:attachments:presign" });
    if (!sessionResult.ok) {
      return sessionResult.response; // 503 on infra error
    }
    const user = sessionResult.session;
    if (!user) return createSecureResponse({ error: "Unauthorized" }, 401, req);

    // Check S3 configuration (returns 501 if not configured)
    try {
      assertS3Configured();
    } catch (error) {
      if (error instanceof S3NotConfiguredError) {
        return createSecureResponse(error.toJSON(), 501, req);
      }
      throw error;
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

    const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 30, 60_000);
    if (!rl.allowed) return rateLimitError();

    const { id } = await props.params;

    let requestBody: Record<string, unknown>;
    try {
      requestBody = await req.json();
    } catch {
      return createSecureResponse({ error: "Invalid JSON body" }, 400, req);
    }
    const { name, type, size } = requestBody;
    if (!name || !type || typeof size !== "number") {
      return createSecureResponse({ error: "Missing name/type/size" }, 400, req);
    }
    const ext = String(name).split(".").pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
      return createSecureResponse(
        { error: "Unsupported file extension" },
        400,
        req,
      );
    }
    if (!ALLOWED_TYPES.has(type as string)) {
      return createSecureResponse({ error: "Unsupported type" }, 400, req);
    }
    if (size > MAX_SIZE_BYTES) {
      return createSecureResponse({ error: "File too large" }, 400, req);
    }

    // Build S3 key with org scoping
    const key = buildS3Key({
      orgId: user.orgId,
      module: "work-orders",
      entityId: id,
      filename: String(name),
      uuid: randomUUID(),
    });

    const { url: putUrl, headers } = await getPresignedPutUrl(
      key,
      String(type),
      900,
      {
        category: "work-order-attachment",
        user: user.id,
        tenant: user.tenantId || "global",
        workOrderId: id,
        orgId: user.orgId,
      },
    );
    const expiresAt = new Date(Date.now() + 900_000).toISOString();

    return NextResponse.json({
      putUrl,
      key,
      expiresAt,
      headers,
      scanRequired: scanEnforced,
    });
  } catch (error) {
    logger.error("[work-orders/presign] POST error", { error });
    return createSecureResponse({ error: "Failed to generate upload URL" }, 500, req);
  }
}

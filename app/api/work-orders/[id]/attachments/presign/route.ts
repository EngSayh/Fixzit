import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { getPresignedPutUrl } from "@/lib/storage/s3";
import { rateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { buildRateLimitKey } from "@/server/security/rateLimitKey";
import { createSecureResponse } from "@/server/security/headers";
import { validateBucketPolicies } from "@/lib/security/s3-policy";

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
  const user = await getSessionUser(req).catch(() => null);
  if (!user) return createSecureResponse({ error: "Unauthorized" }, 401, req);

  if (!process.env.AWS_S3_BUCKET || !process.env.AWS_REGION) {
    return createSecureResponse({ error: "Storage not configured" }, 500, req);
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

  const rl = rateLimit(buildRateLimitKey(req, user.id), 30, 60_000);
  if (!rl.allowed) return rateLimitError();

  const { id } = await props.params;

  const { name, type, size } = await req
    .json()
    .catch(() => ({}) as Record<string, unknown>);
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

  const safeName = encodeURIComponent(
    String(name).replace(/[^a-zA-Z0-9._-]/g, "_"),
  );
  const key = `wo/${id}/${Date.now()}-${randomUUID()}-${safeName}`;
  const { url: putUrl, headers } = await getPresignedPutUrl(
    key,
    String(type),
    900,
    {
      category: "work-order-attachment",
      user: user.id,
      tenant: user.tenantId || "global",
      workOrderId: id,
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
}

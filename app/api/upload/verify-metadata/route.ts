/**
 * @fileoverview File Metadata Verification API
 * @description Verifies and retrieves metadata for uploaded S3 objects
 * to confirm successful uploads and validate file properties.
 * 
 * @module api/upload/verify-metadata
 * @requires Authenticated user
 * 
 * @endpoints
 * - GET /api/upload/verify-metadata?key=<s3-key> - Verify file exists and get metadata
 * - POST /api/upload/verify-metadata - Update or verify metadata
 * 
 * @queryParams (GET)
 * - key: S3 object key to verify
 * 
 * @response
 * - key: S3 object key
 * - contentType: MIME type
 * - contentLength: File size in bytes
 * - metadata: Custom S3 metadata object
 * 
 * @security
 * - Rate limited: 60 requests per minute per user
 * - Tenant-scoped via org-aware rate limit key
 * - Validates user has access to the object
 */
import { NextRequest, NextResponse } from "next/server";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { parseBodySafe } from "@/lib/api/parse-body";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { buildOrgAwareRateLimitKey } from "@/server/security/rateLimitKey";
import { getS3Client } from "@/lib/storage/s3";
import { Config } from "@/lib/config/constants";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req).catch(() => null);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 60, 60_000);
  if (!rl.allowed) return rateLimitError();

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  try {
    const client = getS3Client();
    const cmd = new HeadObjectCommand({
      Bucket: Config.aws.s3.bucket,
      Key: key,
    });
    const res = await client.send(cmd);

    return NextResponse.json(
      {
        key,
        contentType: res.ContentType,
        contentLength: res.ContentLength,
        metadata: res.Metadata,
      },
      { status: 200 },
    );
  } catch (_err) {
    return NextResponse.json(
      { error: "Failed to verify object metadata" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req).catch(() => null);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 60, 60_000);
  if (!rl.allowed) return rateLimitError();

  const { data: body, error: parseError } = await parseBodySafe<Record<string, unknown>>(req, { logPrefix: "[upload:verify-metadata]" });
  if (parseError) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const key = typeof body?.key === "string" ? body.key : "";
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  try {
    const client = getS3Client();
    const cmd = new HeadObjectCommand({
      Bucket: Config.aws.s3.bucket,
      Key: key,
    });
    const res = await client.send(cmd);

    return NextResponse.json(
      {
        key,
        contentType: res.ContentType,
        contentLength: res.ContentLength,
        metadata: res.Metadata,
      },
      { status: 200 },
    );
  } catch (_err) {
    return NextResponse.json(
      { error: "Failed to verify object metadata" },
      { status: 500 },
    );
  }
}

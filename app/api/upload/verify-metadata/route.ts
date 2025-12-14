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
import { getSessionOrNull } from "@/lib/auth/safe-session";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { buildOrgAwareRateLimitKey } from "@/server/security/rateLimitKey";
import { getS3Client } from "@/lib/storage/s3";
import { assertS3Configured, S3NotConfiguredError, getS3Config } from "@/lib/storage/s3-config";
import { validateOrgScopedKey } from "@/lib/storage/org-upload-keys";

export async function GET(req: NextRequest) {
  const sessionResult = await getSessionOrNull(req, { route: "upload:verify-metadata" });
  if (!sessionResult.ok) {
    return sessionResult.response; // 503 on infra error
  }
  const user = sessionResult.session;
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check S3 configuration
  try {
    assertS3Configured();
  } catch (error) {
    if (error instanceof S3NotConfiguredError) {
      return NextResponse.json(error.toJSON(), { status: 501 });
    }
    throw error;
  }
  const s3Config = getS3Config()!;

  const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 60, 60_000);
  if (!rl.allowed) return rateLimitError();

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });
  const keyValidation = validateOrgScopedKey({
    key,
    allowedOrgId: user.tenantId ?? user.orgId,
  });
  if (!keyValidation.ok) {
    return NextResponse.json(
      { error: keyValidation.message },
      { status: keyValidation.status },
    );
  }

  try {
    const client = getS3Client();
    const cmd = new HeadObjectCommand({
      Bucket: s3Config.bucket,
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
  const sessionResult = await getSessionOrNull(req, { route: "upload:verify-metadata" });
  if (!sessionResult.ok) {
    return sessionResult.response; // 503 on infra error
  }
  const user = sessionResult.session;
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check S3 configuration
  try {
    assertS3Configured();
  } catch (error) {
    if (error instanceof S3NotConfiguredError) {
      return NextResponse.json(error.toJSON(), { status: 501 });
    }
    throw error;
  }
  const s3Config = getS3Config()!;

  const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 60, 60_000);
  if (!rl.allowed) return rateLimitError();

  const { data: body, error: parseError } = await parseBodySafe<Record<string, unknown>>(req, { logPrefix: "[upload:verify-metadata]" });
  if (parseError) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const key = typeof body?.key === "string" ? body.key : "";
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });
  const keyValidation = validateOrgScopedKey({
    key,
    allowedOrgId: user.tenantId ?? user.orgId,
  });
  if (!keyValidation.ok) {
    return NextResponse.json(
      { error: keyValidation.message },
      { status: keyValidation.status },
    );
  }

  try {
    const client = getS3Client();
    const cmd = new HeadObjectCommand({
      Bucket: s3Config.bucket,
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

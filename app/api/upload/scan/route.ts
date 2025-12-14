/**
 * @fileoverview File Antivirus Scan API
 * @description Triggers malware/virus scanning for uploaded S3 objects
 * to ensure file safety before processing.
 * 
 * @module api/upload/scan
 * @requires Authenticated user
 * 
 * @endpoints
 * - POST /api/upload/scan - Scan an uploaded file for malware
 * 
 * @requestBody
 * - key: (required) S3 object key to scan
 * 
 * @response
 * - success: boolean - Whether scan completed
 * - clean: boolean - True if file is safe
 * - error: string - Error message if scan failed or malware detected
 * 
 * @validation
 * - S3 bucket must be configured
 * - Scan endpoint must be configured
 * - Bucket policies and encryption validated
 * 
 * @security
 * - Files marked as infected are rejected
 * - Secure response headers applied
 */
import { NextRequest, NextResponse } from "next/server";
import { parseBodySafe } from "@/lib/api/parse-body";
import { getSessionOrNull } from "@/lib/auth/safe-session";
import { createSecureResponse } from "@/server/security/headers";
import { scanS3Object } from "@/lib/security/av-scan";
import { validateBucketPolicies } from "@/lib/security/s3-policy";
import { assertS3Configured, S3NotConfiguredError } from "@/lib/storage/s3-config";
import { Config } from "@/lib/config/constants";
import { logger } from "@/lib/logger";
import {
  buildOrgAwareRateLimitKey,
  smartRateLimit,
} from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { health503 } from "@/lib/api/health";
import { validateOrgScopedKey } from "@/lib/storage/org-upload-keys";

export async function POST(req: NextRequest) {
  try {
    const sessionResult = await getSessionOrNull(req, { route: "upload:scan" });
    if (!sessionResult.ok) {
      return sessionResult.response; // 503 on infra error
    }
    const user = sessionResult.session;
    if (!user) return createSecureResponse({ error: "Unauthorized" }, 401, req);
    const rlKey = buildOrgAwareRateLimitKey(req, user.orgId ?? null, user.id);
    const rl = await smartRateLimit(`${rlKey}:upload-scan`, 20, 60_000);
    if (!rl.allowed) return rateLimitError();

    const { data: body, error: parseError } = await parseBodySafe<{ key?: string }>(req, { logPrefix: "[upload:scan]" });
    if (parseError) {
      return createSecureResponse({ error: "Invalid request body" }, 400, req);
    }
    const key = body?.key;
    if (!key || typeof key !== "string") {
      return createSecureResponse({ error: "Missing key" }, 400, req);
    }
    const keyValidation = validateOrgScopedKey({
      key,
      allowedOrgId: user.tenantId ?? user.orgId,
    });
    if (!keyValidation.ok) {
      return createSecureResponse(
        { error: keyValidation.message },
        keyValidation.status,
        req,
      );
    }

    // Check S3 configuration
    let s3Config;
    try {
      s3Config = assertS3Configured();
    } catch (error) {
      if (error instanceof S3NotConfiguredError) {
        return createSecureResponse(error.toJSON(), 501, req);
      }
      throw error;
    }

    if (!Config.aws.scan.endpoint) {
      return health503("Scan not configured", req, {
        code: "scan_not_configured",
      });
    }

    const policiesOk = await validateBucketPolicies();
    if (!policiesOk) {
      return health503("Bucket policy/encryption invalid", req, {
        code: "scan_bucket_invalid",
      });
    }

    const clean = await scanS3Object(key, s3Config.bucket);
    if (!clean) {
      return createSecureResponse(
        {
          success: false,
          clean: false,
          error: "Scan failed or malware detected",
        },
        400,
        req,
      );
    }

    return NextResponse.json({ success: true, clean: true });
  } catch (err) {
    logger.error("[Upload Scan] Error", err);
    return createSecureResponse({ error: "Scan error" }, 500, req);
  }
}

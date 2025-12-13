/**
 * @fileoverview File Scan Status API
 * @description Retrieves antivirus scan status for uploaded files,
 * allowing clients to poll for scan completion.
 * 
 * @module api/upload/scan-status
 * @requires Authenticated user OR valid status token
 * 
 * @endpoints
 * - GET /api/upload/scan-status?key=<s3-key> - Get scan status for a file
 * - POST /api/upload/scan-status - Batch query multiple files
 * 
 * @queryParams (GET)
 * - key: S3 object key to check
 * 
 * @response
 * - key: S3 object key
 * - status: pending | clean | infected | error
 * - findings: Array of detected issues (if any)
 * - engine: Scanner engine name
 * - sizeBytes: File size
 * - scannedAt: Scan timestamp
 * 
 * @security
 * - Rate limited: 60 requests per minute per user
 * - Token authentication supported for automated systems
 * - Tenant-scoped: Keys verified against user's org
 */
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { parseBodySafe } from "@/lib/api/parse-body";
import { getDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { buildOrgAwareRateLimitKey } from "@/server/security/rateLimitKey";
import { getSessionOrNull } from "@/lib/auth/safe-session";
import { Config } from "@/lib/config/constants";
import {
  extractOrgFromKey,
  sanitizeTenantId,
  validateOrgScopedKey,
} from "@/lib/storage/org-upload-keys";

type ScanStatus = "pending" | "clean" | "infected" | "error";

type ScanDocument = {
  _id: ObjectId;
  key: string;
  status: ScanStatus;
  engine?: string;
  findings?: string[];
  sizeBytes?: number;
  scannedAt?: Date;
  receivedAt?: Date;
};

const COLLECTION = "upload_scans";

function normalizeStatus(value: unknown): ScanStatus {
  if (value === "clean") return "clean";
  if (value === "infected") return "infected";
  if (value === "pending") return "pending";
  if (value === "error") return "error";
  return "pending";
}

async function getStatusForKey(key: string) {
  const db = await getDatabase();
  const collection = db.collection<ScanDocument>(COLLECTION);
  const doc = await collection
    .find({ key })
    .sort({ scannedAt: -1, receivedAt: -1, _id: -1 })
    .limit(1)
    .next();

  return {
    key,
    status: normalizeStatus(doc?.status ?? "pending"),
    findings: doc?.findings,
    engine: doc?.engine,
    sizeBytes: doc?.sizeBytes,
    scannedAt: doc?.scannedAt ?? doc?.receivedAt,
    receivedAt: doc?.receivedAt,
  } as const;
}

function cacheHeaders() {
  return {
    "Cache-Control": "public, max-age=5",
    "CDN-Cache-Control": "max-age=5",
  };
}

type TokenConfig = {
  tokensByOrg: Map<string, string>;
  tokenRequired: boolean;
};

const TOKEN_HEADER = "x-scan-token";

function parseTokensByOrg(): Map<string, string> {
  const map = new Map<string, string>();
  const rawMap =
    process.env.SCAN_STATUS_TOKENS_BY_ORG ||
    process.env.SCAN_STATUS_TOKEN_MAP ||
    "";
  if (rawMap.trim()) {
    try {
      const parsed = JSON.parse(rawMap) as Record<string, string>;
      Object.entries(parsed || {}).forEach(([org, token]) => {
        const sanitizedOrg = sanitizeTenantId(org);
        if (sanitizedOrg && token) {
          map.set(sanitizedOrg, token);
        }
      });
    } catch (error) {
      logger.warn("[scan-status] Failed to parse SCAN_STATUS_TOKENS_BY_ORG", {
        error,
      });
    }
  }

  const singleToken =
    process.env.SCAN_STATUS_TOKEN || Config.aws.scan.statusToken;
  const singleOrg =
    process.env.SCAN_STATUS_TOKEN_ORG ||
    process.env.SCAN_STATUS_TOKEN_ORG_ID ||
    "";
  const sanitizedSingleOrg = sanitizeTenantId(singleOrg);
  if (!map.size && singleToken && sanitizedSingleOrg) {
    map.set(sanitizedSingleOrg, singleToken);
  }

  return map;
}

function getTokenConfig(): TokenConfig {
  const tokenRequiredEnv = process.env.SCAN_STATUS_TOKEN_REQUIRED;
  const tokenRequired =
    tokenRequiredEnv !== undefined
      ? tokenRequiredEnv === "true"
      : Config.aws.scan.statusTokenRequired;
  return { tokensByOrg: parseTokensByOrg(), tokenRequired };
}

function authorizeWithToken(
  keyOrg: string,
  tokenHeader: string | null,
  tokensByOrg: Map<string, string>,
): { ok: true; org: string } | { ok: false; status: number; message: string } {
  const expected = tokensByOrg.get(keyOrg);
  if (!expected) {
    return {
      ok: false,
      status: 401,
      message: "Unauthorized",
    };
  }
  if (!tokenHeader || tokenHeader !== expected) {
    return {
      ok: false,
      status: 401,
      message: "Unauthorized",
    };
  }
  return { ok: true, org: keyOrg };
}

export async function GET(req: NextRequest) {
  const { tokenRequired, tokensByOrg } = getTokenConfig();
  const tokenHeader = req.headers.get(TOKEN_HEADER);
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }
  const keyOrg = extractOrgFromKey(key);
  if (!keyOrg) {
    return NextResponse.json(
      { error: "Key must include organization prefix" },
      { status: 400 },
    );
  }

  let userId: string | null = null;
  let orgId: string | null = null;
  const useTokenFlow = tokenRequired || Boolean(tokenHeader);

  if (useTokenFlow) {
    const result = authorizeWithToken(
      keyOrg,
      tokenHeader,
      tokensByOrg,
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: result.status });
    }
    orgId = result.org;
  } else {
    const sessionResult = await getSessionOrNull(req, { route: "upload:scan-status" });
    if (!sessionResult.ok) {
      return sessionResult.response; // 503 on infra error
    }
    const user = sessionResult.session;
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    userId = user.id;
    orgId = keyValidation.org;
  }

  const rl = await smartRateLimit(
    buildOrgAwareRateLimitKey(req, orgId, userId),
    60,
    60_000,
  );
  if (!rl.allowed) return rateLimitError();

  try {
    const result = await getStatusForKey(key);
    // Cache for 5 seconds to reduce DB load from polling (7s interval client-side)
    return NextResponse.json(result, { status: 200, headers: cacheHeaders() });
  } catch (error) {
    logger.error("[ScanStatus] Failed to read status", {
      error: error as Error,
      key,
    });
    return NextResponse.json(
      { error: "Failed to read status" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const { tokenRequired, tokensByOrg } = getTokenConfig();
  const tokenHeader = req.headers.get(TOKEN_HEADER);
  let userId: string | null = null;
  let orgId: string | null = null;

  let key = "";
  try {
    const { data: body, error: parseError } = await parseBodySafe<Record<string, unknown>>(req, { logPrefix: "[upload:scan-status]" });
    if (parseError) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    key = typeof body?.key === "string" ? body.key : "";
    if (!key) {
      return NextResponse.json({ error: "Missing key" }, { status: 400 });
    }
    const keyOrg = extractOrgFromKey(key);
    if (!keyOrg) {
      return NextResponse.json(
        { error: "Key must include organization prefix" },
        { status: 400 },
      );
    }
    const useTokenFlow = tokenRequired || Boolean(tokenHeader);
    if (useTokenFlow) {
      const result = authorizeWithToken(
        keyOrg,
        tokenHeader,
        tokensByOrg,
      );
      if (!result.ok) {
        return NextResponse.json(
          { error: result.message },
          { status: result.status },
        );
      }
      orgId = result.org;
    } else {
      const sessionResult = await getSessionOrNull(req, { route: "upload:scan-status" });
      if (!sessionResult.ok) {
        return sessionResult.response; // 503 on infra error
      }
      const user = sessionResult.session;
      if (!user)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      userId = user.id;
      orgId = keyValidation.org;
    }

    const rl = await smartRateLimit(
      buildOrgAwareRateLimitKey(req, orgId, userId),
      60,
      60_000,
    );
    if (!rl.allowed) return rateLimitError();

    const result = await getStatusForKey(key);
    logger.info("[ScanStatus] Read status", { key, status: result.status });
    // Cache for 5 seconds to reduce DB load from polling
    return NextResponse.json(result, { status: 200, headers: cacheHeaders() });
  } catch (error) {
    logger.error("[ScanStatus] Failed to read status", {
      error: error as Error,
      key,
    });
    return NextResponse.json(
      { error: "Failed to read status" },
      { status: 500 },
    );
  }
}

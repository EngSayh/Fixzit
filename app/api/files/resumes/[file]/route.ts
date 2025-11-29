import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { getPresignedGetUrl, buildResumeKey } from "@/lib/storage/s3";

import { rateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { buildRateLimitKey } from "@/server/security/rateLimitKey";

// Resume files are stored under a non-public project directory with UUID-based names
const BASE_DIR = path.join(process.cwd(), "private-uploads", "resumes");

/**
 * @openapi
 * /api/files/resumes/[file]:
 *   get:
 *     summary: files/resumes/[file] operations
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
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ file: string }> },
) {
  const params = props.params;
  try {
    const user = await getSessionUser(req).catch(() => null);
    if (!user) return createSecureResponse({ error: "Unauthorized" }, 401, req);
    const allowed = new Set(["SUPER_ADMIN", "ADMIN", "HR"]);
    if (!allowed.has(user.role || ""))
      return createSecureResponse({ error: "Forbidden" }, 403, req);
    const rl = rateLimit(buildRateLimitKey(req, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    const url = new URL(req.url);
    const token = url.searchParams.get("token") || "";
    const expParam = url.searchParams.get("exp") || "";
    const exp = Number(expParam);
    if (!token || !Number.isFinite(exp))
      return createSecureResponse({ error: "Missing token" }, 400, req);
    if (Date.now() > exp)
      return createSecureResponse({ error: "Token expired" }, 403, req);
    const safeName = path.basename(params.file);
    const tenant = String(user.tenantId || "global");
    const expected = generateToken(
      `${tenant}:${safeName}`,
      exp,
      String(user.id || ""),
      tenant,
    );
    if (!timingSafeEqual(expected, token))
      return createSecureResponse({ error: "Invalid token" }, 403, req);

    // Prefer S3 if configured; else local fallback
    if (process.env.AWS_S3_BUCKET) {
      const key = buildResumeKey(user.tenantId, safeName);
      const urlSigned = await getPresignedGetUrl(key, 300);
      return NextResponse.redirect(urlSigned, { status: 302 });
    }
    const filePath = path.join(BASE_DIR, tenant, safeName);
    const data = await fs.readFile(filePath).catch(() => null);
    if (!data) return createSecureResponse({ error: "Not found" }, 404, req);
    const contentType = contentTypeFromName(safeName);
    const out = new Uint8Array(data.length);
    out.set(data);
    return new NextResponse(out, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `attachment; filename="${safeName}"`,
      },
    });
  } catch {
    return createSecureResponse({ error: "Failed to fetch file" }, 500, req);
  }
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ file: string }> },
) {
  const params = props.params;
  try {
    const user = await getSessionUser(req).catch(() => null);
    if (!user) return createSecureResponse({ error: "Unauthorized" }, 401, req);
    const allowed = new Set(["SUPER_ADMIN", "ADMIN", "HR"]);
    if (!allowed.has(user.role || ""))
      return createSecureResponse({ error: "Forbidden" }, 403, req);
    const rl = rateLimit(buildRateLimitKey(req, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    const expires = Date.now() + 1000 * 60 * 10; // 10 minutes
    const safeName = path.basename(params.file);
    const tenant = String(user.tenantId || "global");
    const token = generateToken(
      `${tenant}:${safeName}`,
      expires,
      String(user.id || ""),
      tenant,
    );
    return NextResponse.json({
      url: `${new URL(req.url).origin}/api/files/resumes/${encodeURIComponent(safeName)}?token=${encodeURIComponent(token)}&exp=${expires}`,
    });
  } catch {
    return createSecureResponse({ error: "Failed to sign URL" }, 500, req);
  }
}

// Extend globalThis for dev file signing secret
declare global {
  var __DEV_FILE_SIGN_SECRET__: string | undefined;
}

function generateToken(
  name: string,
  exp: number | undefined,
  userId: string,
  tenantId: string,
) {
  const raw = process.env.FILE_SIGNING_SECRET;
  let secret = typeof raw === "string" ? raw.trim() : "";
  const WEAK = new Set([
    "",
    "dev-secret-change-me",
    "changeme",
    "secret",
    "password",
  ]);
  if (process.env.NODE_ENV === "production" && WEAK.has(secret)) {
    throw new Error(
      "FILE_SIGNING_SECRET must be set to a strong, non-default value in production",
    );
  }
  // In non-production, generate an ephemeral in-memory secret if unset/weak to avoid predictable tokens
  if (process.env.NODE_ENV !== "production" && WEAK.has(secret)) {
    if (!globalThis.__DEV_FILE_SIGN_SECRET__) {
      globalThis.__DEV_FILE_SIGN_SECRET__ = crypto
        .randomBytes(32)
        .toString("hex");
    }
    secret = globalThis.__DEV_FILE_SIGN_SECRET__;
  }
  const payload = `${tenantId}:${userId}:${name}:${exp || ""}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function timingSafeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function contentTypeFromName(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".docx"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".txt")) return "text/plain";
  return "application/octet-stream";
}

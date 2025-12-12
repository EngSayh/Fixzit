/**
 * @fileoverview Trial Request API
 * @description Handles trial/demo request submissions from potential customers
 * with bot detection, rate limiting, and email validation.
 * 
 * @module api/trial-request
 * @public Unauthenticated access allowed
 * 
 * @endpoints
 * - POST /api/trial-request - Submit a trial request
 * 
 * @requestBody
 * - name: (required) Contact name (max 100 chars)
 * - email: (required) Valid email address (max 254 chars)
 * - company: (required) Company name (max 200 chars)
 * - plan: Optional plan interest (max 50 chars)
 * - message: Optional message (max 2000 chars)
 * - phone: Optional phone number (max 20 chars)
 * - website: Honeypot field - must be empty (bot detection)
 * 
 * @response
 * - ok: boolean - Success indicator
 * - id: Created trial request ID (on success)
 * 
 * @security
 * - Rate limited: 3 requests per minute per IP
 * - Secondary rate limit per email address
 * - Honeypot field for bot detection
 * - Zod validation for all inputs
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase, getDatabase } from "@/lib/mongodb-unified";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { z } from "zod";
import { getClientIP } from "@/server/security/headers";
import {
  buildOrgAwareRateLimitKey,
  smartRateLimit,
} from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";

// SECURITY: Zod schema with proper email validation and honeypot field
const trialRequestSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Valid email is required").max(254),
  company: z.string().min(1, "Company is required").max(200),
  plan: z.string().max(50).optional(),
  message: z.string().max(2000).optional(),
  phone: z.string().max(20).optional(),
  // SECURITY: Honeypot field - bots often fill hidden fields
  // If this field has any value, it's likely a bot submission
  website: z.string().max(0, "Invalid submission").optional(),
});

export async function POST(req: NextRequest) {
  const rlKey = buildOrgAwareRateLimitKey(req, null, null);
  const rl = await smartRateLimit(`${rlKey}:trial-request`, 3, 60_000);
  if (!rl.allowed) return rateLimitError();

  // Rate limiting: 3 requests per minute per IP to prevent spam/abuse
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "trial-request",
    requests: 3,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const body = await req.json().catch(() => ({}));

  // SECURITY: Validate with Zod schema including email format and honeypot
  const result = trialRequestSchema.safeParse(body);
  if (!result.success) {
    const errors = result.error.flatten();
    // Check if honeypot was triggered (bot detection)
    if (errors.fieldErrors.website) {
      // Log bot attempt but return generic success to not reveal detection
      logger.warn("[trial-request] Bot submission detected (honeypot triggered)");
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json(
      { error: "Validation failed", details: errors.fieldErrors },
      { status: 400 },
    );
  }

  const {
    name,
    email,
    company,
    plan,
    message,
    phone,
  } = result.data;

  // Secondary rate limit per email to prevent spray attacks
  const emailRateLimit = enforceRateLimit(req, {
    keyPrefix: "trial-request:email",
    identifier: email.toLowerCase(),
    requests: 3,
    windowMs: 60_000,
  });
  if (emailRateLimit) return emailRateLimit;

  const clientIp = getClientIP(req);
  const userAgent = req.headers.get("user-agent") || undefined;

  try {
    // Best-effort: connect so the request can be persisted
    await connectToDatabase().catch(() => null);
    const db = await getDatabase().catch(() => null);
    if (db) {
      await db.collection("trial_requests").insertOne({
        name,
        email,
        company,
        plan: plan || "unspecified",
        message,
        phone,
        clientIp,
        userAgent,
        createdAt: new Date(),
      });
    }
  } catch (error) {
    logger.warn("[trial-request] DB persistence skipped", { error });
  }

  logger.info("[trial-request] Received trial request", {
    company,
    plan: plan || "unspecified",
    // PII redacted: name, email, phone not logged per SEC-029 compliance
  });

  return NextResponse.json({ ok: true });
}

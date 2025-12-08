import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase, getDatabase } from "@/lib/mongodb-unified";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { z } from "zod";

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

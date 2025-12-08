import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

type TrialRequestBody = {
  name?: string;
  email?: string;
  company?: string;
  plan?: string;
  message?: string;
  phone?: string;
};

export async function POST(req: NextRequest) {
  // Rate limiting: 3 requests per minute per IP to prevent spam/abuse
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "trial-request",
    requests: 3,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const body = (await req.json().catch(() => ({}))) as TrialRequestBody;
  const { name, email, company, plan, message: _message, phone: _phone } = body;

  if (!name || !email || !company) {
    return NextResponse.json(
      { error: "name, email, and company are required" },
      { status: 400 },
    );
  }

  try {
    // Best-effort: connect so logs can be persisted if models exist
    await connectToDatabase().catch(() => null);
  } catch (error) {
    logger.warn("[trial-request] DB connection skipped", { error });
  }

  logger.info("[trial-request] Received trial request", {
    company,
    plan: plan || "unspecified",
    // PII redacted: name, email, phone not logged per SEC-029 compliance
  });

  return NextResponse.json({ ok: true });
}

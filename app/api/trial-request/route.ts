import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";

type TrialRequestBody = {
  name?: string;
  email?: string;
  company?: string;
  plan?: string;
  message?: string;
  phone?: string;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as TrialRequestBody;
  const { name, email, company, plan, message, phone } = body;

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
    name,
    email,
    company,
    plan: plan || "unspecified",
    phone,
    message,
  });

  return NextResponse.json({ ok: true });
}

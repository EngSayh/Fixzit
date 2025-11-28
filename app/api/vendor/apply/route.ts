import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";

type VendorApplication = {
  company?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  services?: string;
  notes?: string;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as VendorApplication;
  const { company, contactName, email, phone, services, notes } = body;

  if (!company || !contactName || !email) {
    return NextResponse.json(
      { error: "company, contactName, and email are required" },
      { status: 400 },
    );
  }

  try {
    await connectToDatabase().catch(() => null);
  } catch (error) {
    logger.warn("[vendor-apply] DB connection skipped", { error });
  }

  logger.info("[vendor-apply] Vendor application received", {
    company,
    contactName,
    email,
    phone,
    services,
    notes,
  });

  return NextResponse.json({ ok: true });
}

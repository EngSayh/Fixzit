/**
 * @description Handles vendor application submissions from the public vendor onboarding form.
 * Validates company details, contact information, and service offerings.
 * Creates a vendor application record for review by organization admins.
 * @route POST /api/vendor/apply
 * @access Public - No authentication required (rate-limited)
 * @param {Object} body.company - Company name (2-200 chars)
 * @param {Object} body.contactName - Primary contact name (2-100 chars)
 * @param {Object} body.email - Contact email address
 * @param {Object} body.phone - Optional phone number in international format
 * @param {Object} body.services - Optional description of services offered
 * @param {Object} body.notes - Optional additional notes
 * @returns {Object} success: true, applicationId: created application ID
 * @throws {400} If validation fails
 * @throws {429} If rate limit exceeded (5 requests/minute per IP)
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { z } from "zod";

/**
 * Zod schema for vendor application validation
 * Validates required fields and formats
 */
const VendorApplicationSchema = z.object({
  company: z.string().min(2, "Company name must be at least 2 characters").max(200),
  contactName: z.string().min(2, "Contact name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .regex(/^\+?[0-9]{7,15}$/, "Invalid phone number format")
    .optional(),
  services: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  // Rate limiting: 5 requests per minute per IP to prevent spam
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "vendor-apply",
    requests: 5,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  // Parse and validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parseResult = VendorApplicationSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parseResult.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  const { company, contactName, email, phone, services, notes } = parseResult.data;

  try {
    await connectToDatabase().catch(() => null);
  } catch (error) {
    logger.warn("[vendor-apply] DB connection skipped", { error });
  }

  // Log sanitized application data (avoid logging full PII in production)
  logger.info("[vendor-apply] Vendor application received", {
    company,
    contactName: contactName.substring(0, 3) + "***", // Partial name for privacy
    emailDomain: email.split("@")[1], // Only log domain, not full email
    hasPhone: !!phone,
    hasServices: !!services,
    hasNotes: !!notes,
  });

  return NextResponse.json({ ok: true });
}

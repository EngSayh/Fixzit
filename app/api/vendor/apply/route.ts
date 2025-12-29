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
import { randomUUID } from "crypto";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { z } from "zod";
import { APIParseError, parseBody } from "@/lib/api/parse-body";
import { Vendor } from "@/server/models/Vendor";

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
  services: z.array(z.string().max(200)).max(20).optional(),
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

  try {
    const body = await parseBody(req);
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
      await connectToDatabase();
    } catch (error) {
      logger.error("[vendor-apply] DB connection failed", { error });
      return NextResponse.json(
        { error: "Service temporarily unavailable. Please retry shortly." },
        { status: 503 },
      );
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

    // Generate unique vendor code with full UUID to avoid collisions
    const vendorCode = `VND-${randomUUID().toUpperCase()}`;

    // Create vendor application record with PENDING status
    // Note: Public applications don't have orgId yet - they're assigned during approval
    let vendorApplication;
    try {
      // eslint-disable-next-line local/require-tenant-scope -- PLATFORM-WIDE: Public vendor application before org assignment
      vendorApplication = await Vendor.create({
        code: vendorCode,
        name: company,
        type: "SERVICE_PROVIDER", // Default type for applications
        status: "PENDING",
        contact: {
          primary: {
            name: contactName,
            email: email,
            phone: phone || undefined,
          },
        },
        business: {
          specializations: services ?? [],
        },
        approval: {
          applicantNotes: notes || undefined, // Applicant notes separate from admin reviewNotes
        },
      });
    } catch (createError) {
      // Handle validation/duplicate vs system errors distinctly
      const err = createError as Error & { code?: number; name?: string };
      
      // MongoDB duplicate key error (code 11000) or Mongoose validation error
      if (err.code === 11000) {
        logger.warn("[vendor-apply] Duplicate vendor application", {
          emailDomain: email.split("@")[1],
          company,
        });
        return NextResponse.json(
          { error: "An application with this information already exists" },
          { status: 409 }
        );
      }
      
      if (err.name === "ValidationError") {
        logger.warn("[vendor-apply] Validation failed", {
          error: err.message,
          company,
        });
        return NextResponse.json(
          { error: "Invalid application data. Please check your submission." },
          { status: 400 }
        );
      }
      
      // Unexpected DB/system error - log full details
      logger.error("[vendor-apply] Failed to create vendor application", {
        error: err.message,
        stack: err.stack,
        company,
        emailDomain: email.split("@")[1],
      });
      return NextResponse.json(
        { error: "Unable to process application. Please try again later." },
        { status: 503 }
      );
    }

    logger.info("[vendor-apply] Vendor application created", {
      applicationId: vendorApplication._id.toString(),
      vendorCode,
    });

    return NextResponse.json({
      ok: true,
      success: true,
      applicationId: vendorApplication._id.toString(),
      vendorCode,
    });
  } catch (error) {
    if (error instanceof APIParseError) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }
    logger.error("[vendor-apply] Unexpected error", { error });
    return NextResponse.json(
      { error: "Service temporarily unavailable. Please retry shortly." },
      { status: 503 },
    );
  }
}

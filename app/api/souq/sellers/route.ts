/**
 * @description Manages Souq seller onboarding and registration.
 * POST creates a new seller profile with business information,
 * tier selection, and contact details. Supports individual and company sellers.
 * @route POST /api/souq/sellers - Register new seller
 * @access Private - Authenticated users only
 * @param {Object} body.legalName - Legal business name
 * @param {Object} body.registrationType - Type: individual, company, partnership
 * @param {Object} body.tier - Seller tier: individual, professional, enterprise
 * @param {Object} body.contactEmail - Business contact email
 * @param {Object} body.country - Country code
 * @param {Object} body.city - City name
 * @param {Object} body.address - Full business address
 * @returns {Object} success: true, seller: created seller profile
 * @throws {400} If validation fails or seller already exists
 * @throws {401} If user is not authenticated
 * @throws {403} If organization context missing
 */

import { NextResponse } from "next/server";
import { parseBodySafe } from "@/lib/api/parse-body";
import { logger } from "@/lib/logger";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { SouqSeller } from "@/server/models/souq/Seller";
import { connectDb } from "@/lib/mongodb-unified";
import { nanoid } from "nanoid";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const sellerCreateSchema = z.object({
  legalName: z.string().min(2).max(200),
  tradeName: z.string().max(200).optional(),
  registrationType: z.enum(["individual", "company", "partnership"]),
  registrationNumber: z.string().optional(),
  vatNumber: z.string().optional(),
  country: z.string(),
  city: z.string().min(2),
  address: z.string().min(10),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(10),
  contactPerson: z.string().optional(),
  tier: z.enum(["individual", "professional", "enterprise"]),
  userId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  // Rate limiting: 10 requests per minute per IP for seller registration
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-sellers:register",
    requests: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Authentication check
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = (session.user as { orgId?: string }).orgId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization ID required" },
        { status: 403 },
      );
    }

    await connectDb();

    const { data: body, error: parseError } = await parseBodySafe<Record<string, unknown>>(request, { logPrefix: "[Souq Sellers]" });
    if (parseError) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const validatedData = sellerCreateSchema.parse(body);

    const sellerId = `SEL-${nanoid(10).toUpperCase()}`;

    // eslint-disable-next-line local/require-lean -- NO_LEAN: Simple existence check
    const existingSeller = await SouqSeller.findOne({
      orgId,
      $or: [
        { contactEmail: validatedData.contactEmail },
        { registrationNumber: validatedData.registrationNumber },
      ],
    });

    if (existingSeller) {
      return NextResponse.json(
        {
          error: "Seller already exists with this email or registration number",
        },
        { status: 400 },
      );
    }

    const seller = await SouqSeller.create({
      ...validatedData,
      sellerId,
      orgId, // AUDIT-2025-11-29: Changed from org_id to orgId for consistency
      country: validatedData.country || "SA",
      tier: validatedData.tier || "individual",
      kycStatus: {
        status: "pending",
        step: "company_info",
        companyInfoComplete: false,
        documentsComplete: false,
        bankDetailsComplete: false,
        submittedAt: new Date(),
      },
      isActive: true,
      isSuspended: false,
      accountHealth: {
        orderDefectRate: 0,
        lateShipmentRate: 0,
        cancellationRate: 0,
        validTrackingRate: 100,
        onTimeDeliveryRate: 100,
        score: 100,
        status: "excellent",
        lastCalculated: new Date(),
      },
      fulfillmentMethod: {
        fbf: false,
        fbm: true,
      },
      features: {
        sponsored_ads: (validatedData.tier || "individual") === "enterprise",
        auto_repricer: (validatedData.tier || "individual") !== "individual",
        bulk_upload: true,
        api_access: (validatedData.tier || "individual") === "enterprise",
        dedicated_support:
          (validatedData.tier || "individual") === "enterprise",
      },
      tierEffectiveFrom: new Date(),
      settlementCycle:
        (validatedData.tier || "individual") === "individual" ? 14 : 7,
      holdPeriod: 7,
    });

    return NextResponse.json({
      success: true,
      data: seller,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 },
      );
    }

    logger.error("Seller creation error:", error as Error);
    return NextResponse.json(
      { error: "Failed to create seller account" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = (session.user as { orgId?: string }).orgId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization ID required" },
        { status: 403 },
      );
    }

    await connectDb();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("kycStatus");
    const tier = searchParams.get("tier");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "20", 10),
      100,
    );

    // AUDIT-2025-11-29: Changed from org_id to orgId for consistency
    const query: Record<string, unknown> = { orgId };

    if (status) {
      query["kycStatus.status"] = status;
    }

    if (tier) {
      query.tier = tier;
    }

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { legalName: { $regex: escapedSearch, $options: "i" } },
        { tradeName: { $regex: escapedSearch, $options: "i" } },
        { contactEmail: { $regex: escapedSearch, $options: "i" } },
        { sellerId: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [sellers, total] = await Promise.all([
      SouqSeller.find(query)
        .select("-documents -bankAccount")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SouqSeller.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: sellers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Seller fetch error:", error as Error);
    return NextResponse.json(
      { error: "Failed to fetch sellers" },
      { status: 500 },
    );
  }
}

/**
 * Vendors API
 * 
 * Manages vendor/supplier records for the organization.
 * Vendors can be contractors, suppliers, service providers, or consultants.
 * 
 * @module api/vendors
 * @requires Authentication - Valid session with orgId
 * @requires Authorization - Role-based access control
 * 
 * Vendor Types:
 * - SUPPLIER: Product/material suppliers
 * - CONTRACTOR: Construction/maintenance contractors
 * - SERVICE_PROVIDER: Service providers (cleaning, security, etc.)
 * - CONSULTANT: Professional consultants
 * 
 * Features:
 * - Multi-tenant isolation via orgId
 * - Contact management (primary, secondary)
 * - Business information (registration, licenses)
 * - Certification tracking
 * 
 * Rate Limiting:
 * - Applies smart rate limiting per user/org
 * 
 * @example GET /api/vendors
 * @example POST /api/vendors
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Vendor } from "@/server/models/Vendor";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { getClientIP } from "@/server/security/headers";

const createVendorSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["SUPPLIER", "CONTRACTOR", "SERVICE_PROVIDER", "CONSULTANT"]),
  contact: z.object({
    primary: z.object({
      name: z.string(),
      title: z.string().optional(),
      email: z.string().email(),
      phone: z.string().optional(),
      mobile: z.string().optional(),
    }),
    secondary: z
      .object({
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
      })
      .optional(),
    address: z.object({
      street: z.string(),
      city: z.string(),
      region: z.string(),
      postalCode: z.string().optional(),
    }),
  }),
  business: z
    .object({
      registrationNumber: z.string().optional(),
      taxId: z.string().optional(),
      licenseNumber: z.string().optional(),
      establishedDate: z.string().optional(),
      employees: z.number().optional(),
      annualRevenue: z.number().optional(),
      specializations: z.array(z.string()).optional(),
      certifications: z
        .array(
          z.object({
            name: z.string(),
            issuer: z.string(),
            issued: z.string().optional(),
            expires: z.string().optional(),
            status: z.string().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
  status: z
    .enum(["PENDING", "APPROVED", "SUSPENDED", "REJECTED", "BLACKLISTED"])
    .optional(),
  tags: z.array(z.string()).optional(),
});

function isUnauthenticatedError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes("unauthenticated")
  );
}

async function resolveSessionUser(req: NextRequest) {
  try {
    return await getSessionUser(req);
  } catch (error) {
    if (isUnauthenticatedError(error)) {
      return null;
    }
    throw error;
  }
}

/**
 * @openapi
 * /api/vendors:
 *   get:
 *     summary: vendors operations
 *     tags: [vendors]
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
export async function POST(req: NextRequest) {
  try {
    const user = await resolveSessionUser(req);
    if (!user) {
      return createSecureResponse(
        { error: "Authentication required" },
        401,
        req,
      );
    }

    // Rate limiting AFTER authentication
    const clientIp = getClientIP(req);
    const rl = await smartRateLimit(
      `${new URL(req.url).pathname}:${user.id}:${clientIp}`,
      60,
      60_000,
    );
    if (!rl.allowed) {
      return rateLimitError();
    }
    if (!user?.orgId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Missing tenant context" },
        { status: 401 },
      );
    }
    await connectToDatabase();

    const data = createVendorSchema.parse(await req.json());

    const vendor = await Vendor.create({
      orgId: user.orgId,
      code: `VEN-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`,
      ...data,
      createdBy: user.id,
    });

    return createSecureResponse(vendor, 201, req);
  } catch (error: unknown) {
    const correlationId = crypto.randomUUID();
    logger.error("[POST /api/vendors] Error creating vendor:", {
      correlationId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    const status = error instanceof z.ZodError ? 422 : 500;
    return createSecureResponse(
      {
        error: "Failed to create vendor",
        correlationId,
      },
      status,
      req,
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await resolveSessionUser(req);
    if (!user) {
      return createSecureResponse(
        { error: "Authentication required" },
        401,
        req,
      );
    }

    // Rate limiting AFTER authentication
    const clientIp = getClientIP(req);
    const rl = await smartRateLimit(
      `${new URL(req.url).pathname}:${user.id}:${clientIp}`,
      60,
      60_000,
    );
    if (!rl.allowed) {
      return rateLimitError();
    }
    if (!user?.orgId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Missing tenant context" },
        { status: 401 },
      );
    }
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Number(searchParams.get("limit")) || 20);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const match: Record<string, unknown> = { orgId: user.orgId };

    if (type) match.type = type;
    if (status) match.status = status;
    if (search) {
      match.$text = { $search: search };
    }

    const [items, total] = await Promise.all([
      Vendor.find(match)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Vendor.countDocuments(match),
    ]);

    return NextResponse.json({
      items,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    const correlationId = crypto.randomUUID();
    logger.error("[GET /api/vendors] Error fetching vendors:", {
      correlationId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return createSecureResponse(
      {
        error: "Failed to fetch vendors",
        correlationId,
      },
      500,
      req,
    );
  }
}

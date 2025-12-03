import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Vendor } from "@/server/models/Vendor";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError, handleApiError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { buildRateLimitKey } from "@/server/security/rateLimitKey";

const updateVendorSchema = z.object({
  name: z.string().min(1).optional(),
  type: z
    .enum(["SUPPLIER", "CONTRACTOR", "SERVICE_PROVIDER", "CONSULTANT"])
    .optional(),
  contact: z
    .object({
      primary: z
        .object({
          name: z.string().optional(),
          title: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          mobile: z.string().optional(),
        })
        .optional(),
      secondary: z
        .object({
          name: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
        })
        .optional(),
      address: z
        .object({
          street: z.string().optional(),
          city: z.string().optional(),
          region: z.string().optional(),
          postalCode: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
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

/**
 * @openapi
 * /api/vendors/[id]:
 *   get:
 *     summary: vendors/[id] operations
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
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await props.params;
    const user = await getSessionUser(req);
    // SEC-001: Validate orgId to prevent undefined in tenant-scoped queries
    if (!user?.orgId) {
      return createSecureResponse(
        { error: "Unauthorized", message: "Missing tenant context" },
        401,
        req,
      );
    }
    const rl = await smartRateLimit(buildRateLimitKey(req, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    await connectToDatabase();

    const vendor = await Vendor.findOne({
      _id: id,
      orgId: user.orgId,
    });

    if (!vendor) {
      return createSecureResponse({ error: "Vendor not found" }, 404, req);
    }

    return createSecureResponse(vendor, 200, req);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await props.params;
    const user = await getSessionUser(req);
    // SEC-001: Validate orgId to prevent undefined in tenant-scoped queries
    if (!user?.orgId) {
      return createSecureResponse(
        { error: "Unauthorized", message: "Missing tenant context" },
        401,
        req,
      );
    }
    await connectToDatabase();

    const data = updateVendorSchema.parse(await req.json());

    const vendor = await Vendor.findOneAndUpdate(
      { _id: id, orgId: user.orgId },
      { $set: { ...data, updatedBy: user.id } },
      { new: true },
    );

    if (!vendor) {
      return createSecureResponse({ error: "Vendor not found" }, 404, req);
    }

    return createSecureResponse(vendor, 200, req);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await props.params;
    const user = await getSessionUser(req);
    // SEC-001: Validate orgId to prevent undefined in tenant-scoped queries
    if (!user?.orgId) {
      return createSecureResponse(
        { error: "Unauthorized", message: "Missing tenant context" },
        401,
        req,
      );
    }
    const rl = await smartRateLimit(buildRateLimitKey(req, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    await connectToDatabase();

    const vendor = await Vendor.findOneAndUpdate(
      { _id: id, orgId: user.orgId },
      { $set: { status: "BLACKLISTED", updatedBy: user.id } },
      { new: true },
    );

    if (!vendor) {
      return createSecureResponse({ error: "Vendor not found" }, 404, req);
    }

    return createSecureResponse({ success: true }, 200, req);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

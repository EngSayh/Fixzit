import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Tenant } from "@/server/models/Tenant";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError, handleApiError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { buildOrgAwareRateLimitKey } from "@/server/security/rateLimitKey";

const updateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["INDIVIDUAL", "COMPANY", "GOVERNMENT"]).optional(),
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
      emergency: z
        .object({
          name: z.string().optional(),
          relationship: z.string().optional(),
          phone: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  identification: z
    .object({
      nationalId: z.string().optional(),
      companyRegistration: z.string().optional(),
      taxId: z.string().optional(),
      licenseNumber: z.string().optional(),
    })
    .optional(),
  address: z
    .object({
      current: z
        .object({
          street: z.string().optional(),
          city: z.string().optional(),
          region: z.string().optional(),
          postalCode: z.string().optional(),
        })
        .optional(),
      permanent: z
        .object({
          street: z.string().optional(),
          city: z.string().optional(),
          region: z.string().optional(),
          postalCode: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  preferences: z
    .object({
      communication: z
        .object({
          email: z.boolean().optional(),
          sms: z.boolean().optional(),
          phone: z.boolean().optional(),
          app: z.boolean().optional(),
        })
        .optional(),
      notifications: z
        .object({
          maintenance: z.boolean().optional(),
          rent: z.boolean().optional(),
          events: z.boolean().optional(),
          announcements: z.boolean().optional(),
        })
        .optional(),
      language: z.string().optional(),
      timezone: z.string().optional(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * @openapi
 * /api/tenants/[id]:
 *   get:
 *     summary: tenants/[id] operations
 *     tags: [tenants]
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
  { params }: { params: { id: string } },
) {
  try {
    const user = await getSessionUser(req);
    if (!user?.orgId) {
      return createSecureResponse({ error: "Unauthorized", message: "Missing orgId in session" }, 401, req);
    }
    const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    await connectToDatabase();

    // PERF-002: Read-only query optimization
    const tenant = await Tenant.findOne({
      _id: params.id,
<<<<<<< HEAD
      orgId: user.orgId,
=======
      tenantId: user.tenantId,
>>>>>>> origin/main
    }).lean();

    if (!tenant) {
      return createSecureResponse({ error: "Tenant not found" }, 404, req);
    }

    return createSecureResponse(tenant, 200, req);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getSessionUser(req);
    if (!user?.orgId) {
      return createSecureResponse({ error: "Unauthorized", message: "Missing orgId in session" }, 401, req);
    }
    await connectToDatabase();

    const data = updateTenantSchema.parse(await req.json());

    const tenant = await Tenant.findOneAndUpdate(
      { _id: params.id, orgId: user.orgId },
      { $set: { ...data, updatedBy: user.id } },
      { new: true },
    );

    if (!tenant) {
      return createSecureResponse({ error: "Tenant not found" }, 404, req);
    }

    return createSecureResponse(tenant, 200, req);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getSessionUser(req);
    if (!user?.orgId) {
      return createSecureResponse({ error: "Unauthorized", message: "Missing orgId in session" }, 401, req);
    }
    const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    await connectToDatabase();

    const tenant = await Tenant.findOneAndUpdate(
      { _id: params.id, orgId: user.orgId },
      { $set: { status: "INACTIVE", updatedBy: user.id } },
      { new: true },
    );

    if (!tenant) {
      return createSecureResponse({ error: "Tenant not found" }, 404, req);
    }

    return createSecureResponse({ success: true }, 200, req);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

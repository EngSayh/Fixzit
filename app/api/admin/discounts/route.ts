import { connectToDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import DiscountRule from "@/server/models/DiscountRule";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { smartRateLimit, buildOrgAwareRateLimitKey } from "@/server/security/rateLimit";
import {
  rateLimitError,
  zodValidationError,
} from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { z } from "zod";
export const dynamic = "force-dynamic";

const discountSchema = z.object({
  value: z.number().min(0).max(100),
});

async function authenticateAdmin(req: NextRequest) {
  const token = req.headers
    .get("authorization")
    ?.replace("Bearer ", "")
    ?.trim();
  if (!token) {
    throw new Error("Authentication required");
  }

  const user = await getUserFromToken(token);
  if (!user) {
    throw new Error("Invalid token");
  }

  if (!["SUPER_ADMIN"].includes(user.role)) {
    throw new Error("Admin access required");
  }

  return user;
}

/**
 * @openapi
 * /api/admin/discounts:
 *   get:
 *     summary: admin/discounts operations
 *     tags: [admin]
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
export async function GET(req: NextRequest) {
  try {
    const user = await authenticateAdmin(req);

    const orgId =
      (user as { orgId?: string; tenantId?: string }).orgId ||
      (user as { tenantId?: string }).tenantId ||
      null;

    if (!orgId) {
      return createSecureResponse(
        { error: "Organization context required" },
        400,
        req,
      );
    }

    // Rate limiting (org-aware) after authentication
    const key = buildOrgAwareRateLimitKey(req, orgId, user.id ?? null);
    const rl = await smartRateLimit(key, 100, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    await connectToDatabase();
    // TENANCY: Discounts are tenant-scoped; require orgId
    const d = await DiscountRule.findOne({ key: "ANNUAL", orgId }).lean();
    return NextResponse.json(
      d || { key: "ANNUAL", percentage: 0, editableBySuperAdminOnly: true, orgId },
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Authentication required") {
      return createSecureResponse(
        { error: "Authentication required" },
        401,
        req,
      );
    }
    if (error instanceof Error && error.message === "Invalid token") {
      return createSecureResponse({ error: "Invalid token" }, 401, req);
    }
    if (error instanceof Error && error.message === "Admin access required") {
      return createSecureResponse({ error: "Admin access required" }, 403, req);
    }
    logger.error(
      "Discount fetch failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return createSecureResponse({ error: "Internal server error" }, 500, req);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await authenticateAdmin(req);

    const orgId =
      (user as { orgId?: string; tenantId?: string }).orgId ||
      (user as { tenantId?: string }).tenantId ||
      null;

    if (!orgId) {
      return createSecureResponse(
        { error: "Organization context required" },
        400,
        req,
      );
    }

    // Rate limiting for admin operations
    const key = buildOrgAwareRateLimitKey(req, orgId, user.id ?? null);
    const rl = await smartRateLimit(key, 5, 60_000); // 5 requests per minute for discount changes
    if (!rl.allowed) {
      return createSecureResponse({ error: "Rate limit exceeded" }, 429, req);
    }

    await connectToDatabase();
    const body = discountSchema.parse(await req.json());

    const d = await DiscountRule.findOneAndUpdate(
      { key: "ANNUAL", orgId },
      {
        key: "ANNUAL",
        orgId,
        percentage: body.value,
        editableBySuperAdminOnly: true,
        updatedBy: user.id,
        updatedAt: new Date(),
      },
      { upsert: true, new: true },
    );
    return createSecureResponse(d, 200, req);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return zodValidationError(error, req);
    }
    if (error instanceof Error && error.message === "Authentication required") {
      return createSecureResponse(
        { error: "Authentication required" },
        401,
        req,
      );
    }
    if (error instanceof Error && error.message === "Invalid token") {
      return createSecureResponse({ error: "Invalid token" }, 401, req);
    }
    if (error instanceof Error && error.message === "Admin access required") {
      return createSecureResponse({ error: "Admin access required" }, 403, req);
    }
    logger.error(
      "Discount update failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return createSecureResponse({ error: "Internal server error" }, 500, req);
  }
}

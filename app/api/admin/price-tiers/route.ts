import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import PriceTier from "@/server/models/PriceTier";
import Module from "@/server/models/Module";
import { getUserFromToken } from "@/lib/auth";
import { smartRateLimit, buildOrgAwareRateLimitKey } from "@/server/security/rateLimit";
import { createSecureResponse } from "@/server/security/headers";
import {
  createErrorResponse,
  zodValidationError,
  rateLimitError,
} from "@/server/utils/errorResponses";
import { z } from "zod";

const priceTierSchema = z.object({
  moduleCode: z.string().min(1),
  seatsMin: z.number().min(1),
  seatsMax: z.number().min(1),
  pricePerSeatMonthly: z.number().min(0).optional(),
  flatMonthly: z.number().min(0).optional(),
  currency: z.string().min(1).default("USD"),
  region: z.string().optional(),
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
 * /api/admin/price-tiers:
 *   get:
 *     summary: admin/price-tiers operations
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

    // Rate limiting (org-aware) after successful auth
    const key = buildOrgAwareRateLimitKey(req, orgId, user.id ?? null);
    const rl = await smartRateLimit(key, 100, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    await connectToDatabase();
    // NOTE: Price tiers are global platform configuration (SUPER_ADMIN only), intentionally not org-scoped
    const rows = await PriceTier.find({}).populate("moduleId", "code name");
    return createSecureResponse(rows, 200, req);
  } catch (error: unknown) {
    // Check for specific authentication errors
    if (error instanceof Error) {
      if (error.message === "Authentication required") {
        return createErrorResponse("Authentication required", 401);
      }
      if (error.message === "Invalid token") {
        return createErrorResponse("Invalid token", 401);
      }
      if (error.message === "Admin access required") {
        return createErrorResponse("Admin access required", 403);
      }
    }
    logger.error(
      "Price tier fetch failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return createErrorResponse("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateAdmin(req);

    const orgId =
      (user as { orgId?: string; tenantId?: string }).orgId ||
      (user as { tenantId?: string }).tenantId ||
      null;

    // Rate limiting for admin operations (org-aware)
    const key = buildOrgAwareRateLimitKey(req, orgId, user.id ?? null);
    const rl = await smartRateLimit(key, 20, 60_000); // 20 requests per minute
    if (!rl.allowed) {
      return createErrorResponse("Rate limit exceeded", 429, req);
    }

    await connectToDatabase();
    const body = priceTierSchema.parse(await req.json());

    // body: { moduleCode, seatsMin, seatsMax, pricePerSeatMonthly, flatMonthly, currency, region }
    const mod = await Module.findOne({ code: body.moduleCode });
    if (!mod) return createErrorResponse("MODULE_NOT_FOUND", 400, req);

    const doc = await PriceTier.findOneAndUpdate(
      {
        moduleId: mod._id,
        seatsMin: body.seatsMin,
        seatsMax: body.seatsMax,
        currency: body.currency || "USD",
      },
      { ...body, moduleId: mod._id, updatedBy: user.id, updatedAt: new Date() },
      { upsert: true, new: true },
    );
    return createSecureResponse(doc, 201, req);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return zodValidationError(error);
    }
    // Check for specific authentication errors
    if (error instanceof Error) {
      if (error.message === "Authentication required") {
        return createErrorResponse("Authentication required", 401);
      }
      if (error.message === "Invalid token") {
        return createErrorResponse("Invalid token", 401);
      }
      if (error.message === "Admin access required") {
        return createErrorResponse("Admin access required", 403);
      }
    }
    logger.error(
      "Price tier creation failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return createErrorResponse("Internal server error", 500);
  }
}

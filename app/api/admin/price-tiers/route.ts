/**
 * @description Manages pricing tiers for platform modules.
 * GET lists all price tiers with module info.
 * POST creates new price tier with seat-based or flat pricing.
 * Supports regional pricing and global defaults.
 * @route GET /api/admin/price-tiers
 * @route POST /api/admin/price-tiers
 * @access Private - SUPER_ADMIN only
 * @param {Object} body - moduleCode, seatsMin, seatsMax, pricePerSeatMonthly, flatMonthly, currency, region
 * @returns {Object} priceTiers: array or created tier
 * @throws {401} If not authenticated
 * @throws {403} If not SUPER_ADMIN
 * @throws {400} If validation fails
 */
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
  isGlobal: z.boolean().optional(),
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

    // Optional includeGlobal=true to merge shared tiers with org-scoped tiers
    const includeGlobal = req.nextUrl.searchParams.get("includeGlobal") === "true";
    const query = includeGlobal && orgId
      ? { $or: [{ orgId }, { isGlobal: true }] }
      : orgId
        ? { orgId }
        : includeGlobal
          ? { isGlobal: true }
          : {};

    await connectToDatabase();
    const rows = await PriceTier.find(query)
      .populate("moduleId", "code name")
      .lean();
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

    const isGlobalRequested = body.isGlobal === true;
    const isSuperAdmin = user.role === "SUPER_ADMIN";
    if (isGlobalRequested && !isSuperAdmin) {
      return createErrorResponse("Global tiers require SUPER_ADMIN", 403, req);
    }
    const isGlobal = isSuperAdmin && isGlobalRequested;

    // PLATFORM-WIDE: module catalog is global
    const mod = await Module.findOne({ code: body.moduleCode }).lean();
    if (!mod) return createErrorResponse("MODULE_NOT_FOUND", 400, req);

    // SUPER_ADMIN: global tiers are platform-wide; tenant tiers include orgId
    const doc = await PriceTier.findOneAndUpdate(
      {
        moduleId: mod._id,
        seatsMin: body.seatsMin,
        seatsMax: body.seatsMax,
        currency: body.currency || "USD",
        ...(isGlobal ? { isGlobal: true } : orgId ? { orgId } : {}),
      },
      {
        ...body,
        moduleId: mod._id,
        orgId: isGlobal ? undefined : orgId,
        isGlobal,
        updatedBy: user.id,
        updatedAt: new Date(),
      },
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

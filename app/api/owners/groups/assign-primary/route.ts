import { connectToDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { NextRequest } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { z } from "zod";

import { rateLimit } from "@/server/security/rateLimit";
import {
  zodValidationError,
  rateLimitError,
} from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { getClientIP } from "@/server/security/headers";
import { canManageOwnerGroups } from "@/lib/auth/role-guards";

const assignPrimarySchema = z.object({
  buildingId: z.string().min(1),
  ownerIds: z.array(z.string()),
  primaryContactUserId: z.string().min(1),
});

/**
 * @openapi
 * /api/owners/groups/assign-primary:
 *   get:
 *     summary: owners/groups/assign-primary operations
 *     tags: [owners]
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
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    // Authentication & Authorization
    const token = req.headers
      .get("authorization")
      ?.replace("Bearer ", "")
      ?.trim();
    if (!token) {
      return createSecureResponse(
        { error: "Authentication required" },
        401,
        req,
      );
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return createSecureResponse({ error: "Invalid token" }, 401, req);
    }

    // Role-based access control - only property admins can assign owner groups
    if (!canManageOwnerGroups(user.role)) {
      return createSecureResponse(
        { error: "Insufficient permissions to manage owner groups" },
        403,
        req,
      );
    }

    await connectToDatabase();
    const body = assignPrimarySchema.parse(await req.json());

    // Tenant isolation - ensure group belongs to user's org
    const { OwnerGroupModel } = await import("@/server/models/OwnerGroup");
    const g = await OwnerGroupModel.findOneAndUpdate(
      { buildingId: body.buildingId, orgId: user.orgId },
      {
        buildingId: body.buildingId,
        ownerIds: body.ownerIds,
        primaryContactUserId: body.primaryContactUserId,
        orgId: user.orgId,
        updatedBy: user.id,
        updatedAt: new Date(),
      },
      { upsert: true, new: true },
    );
    return createSecureResponse(g, 201, req);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return zodValidationError(error, req);
    }
    logger.error(
      "Owner group assignment failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return createSecureResponse(
      { error: "Failed to assign owner group" },
      500,
      req,
    );
  }
}

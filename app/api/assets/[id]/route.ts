/**
 * @description Manages individual asset records for facility equipment tracking.
 * Supports retrieval, updates, and deletion of assets (HVAC, electrical, elevators, etc.).
 * All operations are tenant-scoped with proper RBAC enforcement.
 * @route GET /api/assets/[id] - Retrieve asset details
 * @route PATCH /api/assets/[id] - Update asset properties
 * @route DELETE /api/assets/[id] - Soft delete an asset
 * @access Private - Authenticated users with asset management permissions
 * @param {string} id - The unique asset identifier
 * @returns {Object} GET: asset details | PATCH: updated asset | DELETE: success status
 * @throws {401} If user is not authenticated
 * @throws {403} If user lacks permission for the operation
 * @throws {404} If asset is not found
 * @throws {429} If rate limit exceeded
 */
import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Asset } from "@/server/models/Asset";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { Types } from "mongoose";

import { smartRateLimit } from "@/server/security/rateLimit";
import {
  zodValidationError,
  rateLimitError,
  handleApiError,
} from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { buildOrgAwareRateLimitKey } from "@/server/security/rateLimitKey";

const updateAssetSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z
    .enum([
      "HVAC",
      "ELECTRICAL",
      "PLUMBING",
      "SECURITY",
      "ELEVATOR",
      "GENERATOR",
      "FIRE_SYSTEM",
      "IT_EQUIPMENT",
      "VEHICLE",
      "OTHER",
    ])
    .optional(),
  category: z.string().min(1).optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  propertyId: z.string().min(1).optional(),
  location: z
    .object({
      building: z.string().optional(),
      floor: z.string().optional(),
      room: z.string().optional(),
      coordinates: z
        .object({
          lat: z.number(),
          lng: z.number(),
        })
        .optional(),
    })
    .optional(),
  specs: z
    .object({
      capacity: z.string().optional(),
      powerRating: z.string().optional(),
      voltage: z.string().optional(),
      current: z.string().optional(),
      frequency: z.string().optional(),
      dimensions: z.string().optional(),
      weight: z.string().optional(),
    })
    .optional(),
  status: z
    .enum(["ACTIVE", "MAINTENANCE", "OUT_OF_SERVICE", "DECOMMISSIONED"])
    .optional(),
  criticality: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Retrieve an asset by ID for the authenticated user's tenant.
 *
 * Authenticates the requester, ensures the database is ready, and returns the matching asset document as JSON.
 *
 * @param params.id - The asset's MongoDB `_id`.
 * @returns A NextResponse containing the asset on success, or a JSON error with an appropriate HTTP status:
 * - 401 Unauthorized when authentication fails
 * - 404 Asset not found when no matching asset exists for the tenant
 * - 400 Invalid asset id for malformed IDs
 * - 500 Internal server error for other failures
 */
/**
 * @openapi
 * /api/assets/[id]:
 *   get:
 *     summary: assets/[id] operations
 *     tags: [assets]
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
    const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    await connectToDatabase();

    if (!params?.id || !Types.ObjectId.isValid(params.id)) {
      return createSecureResponse({ error: "Invalid asset id" }, 400, req);
    }
    const orgCandidates =
      Types.ObjectId.isValid(user.orgId) ? [user.orgId, new Types.ObjectId(user.orgId)] : [user.orgId];
    const asset = await Asset.findOne({
      _id: params.id,
      orgId: { $in: orgCandidates },
    }).lean();

    if (!asset) {
      return createSecureResponse({ error: "Asset not found" }, 404, req);
    }

    return createSecureResponse(asset, 200, req);
  } catch (error: unknown) {
    const name =
      error && typeof error === "object" && "name" in error ? error.name : "";
    if (name === "CastError") {
      return createSecureResponse({ error: "Invalid asset id" }, 400, req);
    }
    return handleApiError(error);
  }
}

/**
 * Partially updates an existing asset belonging to the authenticated user's tenant.
 *
 * Validates the request body against `updateAssetSchema`, applies the changes, sets `updatedBy`
 * to the current user, and returns the updated asset document. Authentication is required.
 *
 * Possible responses:
 * - 200: Updated asset JSON
 * - 401: Unauthorized (no valid session)
 * - 404: Asset not found (no matching asset for the id and tenant)
 * - 422: Validation failed (Zod validation errors)
 * - 400: Invalid asset id (malformed id)
 * - 500: Internal server error
 *
 * @param params.id - The asset id to update
 * @returns The HTTP response containing the updated asset or an error payload with an appropriate status code.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getSessionUser(req);
    await connectToDatabase();

    const data = updateAssetSchema.parse(await req.json());

    const asset = await Asset.findOneAndUpdate(
      { _id: params.id, orgId: user.orgId },
      { $set: { ...data, updatedBy: user.id } },
      { new: true },
    );

    if (!asset) {
      return createSecureResponse({ error: "Asset not found" }, 404, req);
    }

    return createSecureResponse(asset, 200, req);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return zodValidationError(error, req);
    }
    const name =
      error && typeof error === "object" && "name" in error ? error.name : "";
    if (name === "CastError") {
      return createSecureResponse({ error: "Invalid asset id" }, 400, req);
    }
    return handleApiError(error);
  }
}

/**
 * Soft-deletes an asset by marking it "DECOMMISSIONED".
 *
 * Authenticates the requester, then updates the asset with the given `id` (scoped to the requester's tenant)
 * setting `status` to `"DECOMMISSIONED"` and `updatedBy` to the current user id.
 *
 * @param params.id - Asset id from the route (used to look up and update the asset)
 * @returns A NextResponse JSON result:
 * - 200 with `{ success: true }` when the asset is successfully updated
 * - 401 when the requester is not authenticated
 * - 404 when no matching asset is found for the tenant
 * - 500 with an error message for other failures
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getSessionUser(req);
    const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    await connectToDatabase();

    const asset = await Asset.findOneAndUpdate(
      { _id: params.id, orgId: user.orgId },
      { $set: { status: "DECOMMISSIONED", updatedBy: user.id } },
      { new: true },
    );

    if (!asset) {
      return createSecureResponse({ error: "Asset not found" }, 404, req);
    }

    return createSecureResponse({ success: true }, 200, req);
  } catch (error: unknown) {
    const name =
      error && typeof error === "object" && "name" in error ? error.name : "";
    if (name === "CastError") {
      return createSecureResponse({ error: "Invalid asset id" }, 400, req);
    }
    return handleApiError(error);
  }
}

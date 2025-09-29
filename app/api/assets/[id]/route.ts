import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/src/lib/mongo";
import { Asset } from "@/src/server/models/Asset";
import { z } from "zod";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";

const updateAssetSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(["HVAC", "ELECTRICAL", "PLUMBING", "SECURITY", "ELEVATOR", "GENERATOR", "FIRE_SYSTEM", "IT_EQUIPMENT", "VEHICLE", "OTHER"]).optional(),
  category: z.string().min(1).optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  propertyId: z.string().min(1).optional(),
  location: z.object({
    building: z.string().optional(),
    floor: z.string().optional(),
    room: z.string().optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number()
    }).optional()
  }).optional(),
  specs: z.object({
    capacity: z.string().optional(),
    powerRating: z.string().optional(),
    voltage: z.string().optional(),
    current: z.string().optional(),
    frequency: z.string().optional(),
    dimensions: z.string().optional(),
    weight: z.string().optional()
  }).optional(),
  status: z.enum(["ACTIVE", "MAINTENANCE", "OUT_OF_SERVICE", "DECOMMISSIONED"]).optional(),
  criticality: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  tags: z.array(z.string()).optional()
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
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    await connectDb();

    const asset = await Asset.findOne({
      _id: params.id,
      tenantId: user.tenantId
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json(asset);
  } catch (error: any) {
    if (error?.name === "CastError") {
      return NextResponse.json({ error: "Invalid asset id" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    await connectDb();

    const data = updateAssetSchema.parse(await req.json());

    const asset = await Asset.findOneAndUpdate(
      { _id: params.id, tenantId: user.tenantId },
      { $set: { ...data, updatedBy: user.id } },
      { new: true }
    );

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json(asset);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 422 });
    }
    if (error?.name === "CastError") {
      return NextResponse.json({ error: "Invalid asset id" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    await connectDb();

    const asset = await Asset.findOneAndUpdate(
      { _id: params.id, tenantId: user.tenantId },
      { $set: { status: "DECOMMISSIONED", updatedBy: user.id } },
      { new: true }
    );

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.name === "CastError") {
      return NextResponse.json({ error: "Invalid asset id" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

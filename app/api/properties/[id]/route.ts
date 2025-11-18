import { NextRequest} from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Property } from "@/server/models/Property";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError, handleApiError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { buildRateLimitKey } from '@/server/security/rateLimitKey';

const updatePropertySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(["RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL", "MIXED_USE", "LAND"]).optional(),
  subtype: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    region: z.string().optional(),
    postalCode: z.string().optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number()
    }).optional(),
    nationalAddress: z.string().optional(),
    district: z.string().optional()
  }).optional(),
  details: z.object({
    totalArea: z.number().optional(),
    builtArea: z.number().optional(),
    bedrooms: z.number().optional(),
    bathrooms: z.number().optional(),
    floors: z.number().optional(),
    parkingSpaces: z.number().optional(),
    yearBuilt: z.number().optional(),
    occupancyRate: z.number().min(0).max(100).optional()
  }).optional(),
  ownership: z.object({
    type: z.enum(["OWNED", "LEASED", "MANAGED"]).optional(),
    owner: z.object({
      name: z.string().optional(),
      contact: z.string().optional(),
      id: z.string().optional()
    }).optional(),
    lease: z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      monthlyRent: z.number().optional(),
      landlord: z.string().optional()
    }).optional()
  }).optional(),
  features: z.object({
    amenities: z.array(z.string()).optional(),
    utilities: z.object({
      electricity: z.string().optional(),
      water: z.string().optional(),
      gas: z.string().optional(),
      internet: z.string().optional()
    }).optional(),
    accessibility: z.object({
      elevator: z.boolean().optional(),
      ramp: z.boolean().optional(),
      parking: z.boolean().optional()
    }).optional()
  }).optional(),
  tags: z.array(z.string()).optional()
});

/**
 * @openapi
 * /api/properties/[id]:
 *   get:
 *     summary: properties/[id] operations
 *     tags: [properties]
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
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getSessionUser(req);
    const rl = rateLimit(buildRateLimitKey(req, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    await connectToDatabase();

    const property = (await Property.findOne({
      _id: params.id,
      tenantId: user.tenantId
    }));

    if (!property) {
      return createSecureResponse({ error: "Property not found" }, 404, req);
    }

    return createSecureResponse(property, 200, req);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getSessionUser(req);
    await connectToDatabase();

    const data = updatePropertySchema.parse(await req.json());

    const property = (await Property.findOneAndUpdate(
      { _id: params.id, tenantId: user.tenantId },
      { $set: { ...data, updatedBy: user.id } },
      { new: true }
    ));

    if (!property) {
      return createSecureResponse({ error: "Property not found" }, 404, req);
    }

    return createSecureResponse(property, 200, req);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getSessionUser(req);
    const rl = rateLimit(buildRateLimitKey(req, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    await connectToDatabase();

    // Soft delete by updating status
    const property = (await Property.findOneAndUpdate(
      { _id: params.id, tenantId: user.tenantId },
      { $set: { 'units.$[].status': 'SOLD', updatedBy: user.id } },
      { new: true }
    ));

    if (!property) {
      return createSecureResponse({ error: "Property not found" }, 404, req);
    }

    return createSecureResponse({ success: true }, 200, req);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

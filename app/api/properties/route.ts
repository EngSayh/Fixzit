import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Property } from "@/server/models/Property";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, forbiddenError, notFoundError, validationError, zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

const createPropertySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL", "MIXED_USE", "LAND"]),
  subtype: z.string().optional(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    region: z.string(),
    postalCode: z.string().optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number()
    }),
    nationalAddress: z.string().optional(),
    district: z.string().optional()
  }),
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
    type: z.enum(["OWNED", "LEASED", "MANAGED"]),
    owner: z.object({
      name: z.string(),
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
 * /api/properties:
 *   get:
 *     summary: properties operations
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
export async function POST(req: NextRequest) {
  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`${req.url}:${clientIp}`, 60, 60);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    const user = await getSessionUser(req);
    if (!user?.orgId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing tenant context' },
        { status: 401 }
      );
    }
    await connectToDatabase();

    const data = createPropertySchema.parse(await req.json());

    const property = await Property.create({
      tenantId: user.orgId,
      code: `PROP-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`,
      ...data,
      createdBy: user.id
    });

    return createSecureResponse(property, 201, req);
  } catch (error: any) {
    return createSecureResponse({ error: error.message }, 400, req);
  }
}

export async function GET(req: NextRequest) {
  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`${req.url}:${clientIp}`, 60, 60);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    // Require authentication - no bypass allowed
    const user = await getSessionUser(req);
    if (!user?.orgId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing tenant context' },
        { status: 401 }
      );
    }
    if (!user) {
      return createSecureResponse({ error: 'Authentication required' }, 401, req);
    }
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Number(searchParams.get("limit")) || 20);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const city = searchParams.get("city");
    const search = searchParams.get("search");

    const match: any = { tenantId: user.orgId };

    if (type) match.type = type;
    if (status) match['units.status'] = status;
    if (city) match['address.city'] = city;
    if (search) {
      match.$text = { $search: search };
    }

    const [items, total] = await Promise.all([
      (Property as any).find(match)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      (Property as any).countDocuments(match)
    ]);

    return NextResponse.json({
      items,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    return createSecureResponse({ error: error.message }, 500, req);
  }
}



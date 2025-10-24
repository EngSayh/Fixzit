import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Tenant } from "@/server/models/Tenant";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError, handleApiError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { getClientIP } from '@/server/security/headers';

const createTenantSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["INDIVIDUAL", "COMPANY", "GOVERNMENT"]),
  contact: z.object({
    primary: z.object({
      name: z.string(),
      title: z.string().optional(),
      email: z.string().email(),
      phone: z.string().optional(),
      mobile: z.string().optional()
    }),
    secondary: z.object({
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional()
    }).optional(),
    emergency: z.object({
      name: z.string().optional(),
      relationship: z.string().optional(),
      phone: z.string().optional()
    }).optional()
  }),
  identification: z.object({
    nationalId: z.string().optional(),
    companyRegistration: z.string().optional(),
    taxId: z.string().optional(),
    licenseNumber: z.string().optional()
  }).optional(),
  address: z.object({
    current: z.object({
      street: z.string(),
      city: z.string(),
      region: z.string(),
      postalCode: z.string().optional()
    }),
    permanent: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      region: z.string().optional(),
      postalCode: z.string().optional()
    }).optional()
  }),
  preferences: z.object({
    communication: z.object({
      email: z.boolean().optional(),
      sms: z.boolean().optional(),
      phone: z.boolean().optional(),
      app: z.boolean().optional()
    }).optional(),
    notifications: z.object({
      maintenance: z.boolean().optional(),
      rent: z.boolean().optional(),
      events: z.boolean().optional(),
      announcements: z.boolean().optional()
    }).optional(),
    language: z.string().optional(),
    timezone: z.string().optional()
  }).optional(),
  tags: z.array(z.string()).optional()
});

/**
 * @openapi
 * /api/tenants:
 *   get:
 *     summary: tenants operations
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
export async function POST(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    await connectToDatabase();
    const user = await getSessionUser(req);
    if (!user?.orgId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing tenant context' },
        { status: 401 }
      );
    }

    const data = createTenantSchema.parse(await req.json());

    const tenant = await Tenant.create({
      tenantId: user.orgId,
      code: `TEN-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`,
      ...data,
      createdBy: user.id
    });

    return createSecureResponse(tenant, 201, req);
  } catch (error: unknown) {
    console.error('POST /api/tenants error:', error instanceof Error ? error.message : 'Unknown error');
    return handleApiError(error);
  }
}

export async function GET(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    await connectToDatabase();
    let user;
    try {
      user = await getSessionUser(req);
    } catch {
      return createSecureResponse({ error: "Unauthorized" }, 401, req);
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Number(searchParams.get("limit")) || 20);
    const type = searchParams.get("type");
    const search = searchParams.get("search");

    const match: Record<string, unknown> = { tenantId: user.orgId };

    if (type) match.type = type;
    if (search) {
      match.$text = { $search: search };
    }

    const [items, total] = await Promise.all([
      Tenant.find(match)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Tenant.countDocuments(match)
    ]);

    return NextResponse.json({
      items,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error: unknown) {
    console.error('GET /api/tenants error:', error instanceof Error ? error.message : 'Unknown error');
    return handleApiError(error);
  }
}



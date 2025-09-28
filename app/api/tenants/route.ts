import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/src/lib/mongo";
import { Tenant } from "@/src/server/models/Tenant";
import { z } from "zod";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";

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

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const user = await getSessionUser(req);

    const data = createTenantSchema.parse(await req.json());

    const tenant = await Tenant.create({
      tenantId: user.tenantId,
      code: `TEN-${Date.now()}`,
      ...data,
      createdBy: user.id
    });

    return NextResponse.json(tenant, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    let user;
    try {
      user = await getSessionUser(req);
    } catch (error: any) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Number(searchParams.get("limit")) || 20);
    const type = searchParams.get("type");
    const search = searchParams.get("search");

    const match: any = { tenantId: user.tenantId };

    if (type) match.type = type;
    if (search) {
      match.$text = { $search: search };
    }

    const [items, total] = await Promise.all([
      (Tenant as any).find(match)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      (Tenant as any).countDocuments(match)
    ]);

    return NextResponse.json({
      items,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

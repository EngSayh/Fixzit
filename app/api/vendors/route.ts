import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Vendor } from "@/server/models/Vendor";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

const createVendorSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["SUPPLIER", "CONTRACTOR", "SERVICE_PROVIDER", "CONSULTANT"]),
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
    address: z.object({
      street: z.string(),
      city: z.string(),
      region: z.string(),
      postalCode: z.string().optional()
    })
  }),
  business: z.object({
    registrationNumber: z.string().optional(),
    taxId: z.string().optional(),
    licenseNumber: z.string().optional(),
    establishedDate: z.string().optional(),
    employees: z.number().optional(),
    annualRevenue: z.number().optional(),
    specializations: z.array(z.string()).optional(),
    certifications: z.array(z.object({
      name: z.string(),
      issuer: z.string(),
      issued: z.string().optional(),
      expires: z.string().optional(),
      status: z.string().optional()
    })).optional()
  }).optional(),
  status: z.enum(["PENDING", "APPROVED", "SUSPENDED", "REJECTED", "BLACKLISTED"]).optional(),
  tags: z.array(z.string()).optional()
});

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    await connectToDatabase();

    const data = createVendorSchema.parse(await req.json());

    const vendor = await Vendor.create({
      tenantId: (user as any)?.orgId,
      code: `VEN-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`,
      ...data,
      createdBy: user.id
    });

    return NextResponse.json(vendor, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Number(searchParams.get("limit")) || 20);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const match: any = { tenantId: (user as any)?.orgId };

    if (type) match.type = type;
    if (status) match.status = status;
    if (search) {
      match.$text = { $search: search };
    }

    const [items, total] = await Promise.all([
      Vendor.find(match)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Vendor.countDocuments(match)
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


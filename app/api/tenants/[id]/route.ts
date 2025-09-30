import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Tenant } from "@/server/models/Tenant";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

const updateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["INDIVIDUAL", "COMPANY", "GOVERNMENT"]).optional(),
  contact: z.object({
    primary: z.object({
      name: z.string().optional(),
      title: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      mobile: z.string().optional()
    }).optional(),
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
  }).optional(),
  identification: z.object({
    nationalId: z.string().optional(),
    companyRegistration: z.string().optional(),
    taxId: z.string().optional(),
    licenseNumber: z.string().optional()
  }).optional(),
  address: z.object({
    current: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      region: z.string().optional(),
      postalCode: z.string().optional()
    }).optional(),
    permanent: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      region: z.string().optional(),
      postalCode: z.string().optional()
    }).optional()
  }).optional(),
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

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getSessionUser(req);
    await connectToDatabase();

    const tenant = await Tenant.findOne({
      _id: params.id,
      tenantId: user.tenantId
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json(tenant);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getSessionUser(req);
    await connectToDatabase();

    const data = updateTenantSchema.parse(await req.json());

    const tenant = await Tenant.findOneAndUpdate(
      { _id: params.id, tenantId: user.tenantId },
      { $set: { ...data, updatedBy: user.id } },
      { new: true }
    );

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json(tenant);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getSessionUser(req);
    await connectToDatabase();

    const tenant = await Tenant.findOneAndUpdate(
      { _id: params.id, tenantId: user.tenantId },
      { $set: { status: 'INACTIVE', updatedBy: user.id } },
      { new: true }
    );

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

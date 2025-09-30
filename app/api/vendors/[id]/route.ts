import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Vendor } from "@/server/models/Vendor";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

const updateVendorSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["SUPPLIER", "CONTRACTOR", "SERVICE_PROVIDER", "CONSULTANT"]).optional(),
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
    address: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      region: z.string().optional(),
      postalCode: z.string().optional()
    }).optional()
  }).optional(),
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

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getSessionUser(req);
    await connectToDatabase();

    const vendor = await Vendor.findOne({
      _id: params.id,
      tenantId: user.tenantId
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json(vendor);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getSessionUser(req);
    await connectToDatabase();

    const data = updateVendorSchema.parse(await req.json());

    const vendor = await Vendor.findOneAndUpdate(
      { _id: params.id, tenantId: user.tenantId },
      { $set: { ...data, updatedBy: user.id } },
      { new: true }
    );

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json(vendor);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getSessionUser(req);
    await connectToDatabase();

    const vendor = await Vendor.findOneAndUpdate(
      { _id: params.id, tenantId: user.tenantId },
      { $set: { status: "BLACKLISTED", updatedBy: user.id } },
      { new: true }
    );

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

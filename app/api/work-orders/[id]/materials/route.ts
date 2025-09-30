import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { WorkOrder } from "@/server/models/WorkOrder";
import { z } from "zod";
import { requireAbility } from "@/server/middleware/withAuthRbac";

const upsertSchema = z.object({ sku:z.string().optional(), name:z.string(), qty:z.number().positive(), unitPrice:z.number().nonnegative(), currency:z.string().default("SAR") });

export async function POST(req:NextRequest, props:{params: Promise<{id:string}>}) {
  const params = await props.params;
  const user = await requireAbility("EDIT")(req);
  if (user instanceof NextResponse) return user as any;
  await connectToDatabase();
  const m = upsertSchema.parse(await req.json());
  // Validate MongoDB ObjectId format
  if (!/^[a-fA-F0-9]{24}$/.test(params.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const wo:any = await (WorkOrder as any).findOne({ _id: params.id, tenantId: user.tenantId });
  if (!wo) return NextResponse.json({error:"Not found"},{status:404});
  wo.materials.push(m);
  const materials = wo.materials.reduce((s:any,c:any)=>s+(c.qty*c.unitPrice),0);
  const total = (wo.costSummary?.labor||0) + materials + (wo.costSummary?.other||0);
  wo.costSummary = { ...(wo.costSummary||{}), materials, total };
  await wo.save();
  return NextResponse.json(wo.materials);
}

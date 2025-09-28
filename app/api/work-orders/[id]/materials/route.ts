import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/src/lib/mongo";
import { WorkOrder } from "@/src/server/models/WorkOrder";
import { z } from "zod";
import { requireAbility } from "@/src/server/middleware/withAuthRbac";

const upsertSchema = z.object({ sku:z.string().optional(), name:z.string(), qty:z.number().positive(), unitPrice:z.number().nonnegative(), currency:z.string().default("SAR") });

export async function POST(req:NextRequest, {params}:{params:{id:string}}){
  const user = await requireAbility("EDIT")(req);
  if (user instanceof NextResponse) return user as any;
  await connectDb();
  const m = upsertSchema.parse(await req.json());
  const wo:any = await (WorkOrder as any).findById(params.id);
  if (!wo) return NextResponse.json({error:"Not found"},{status:404});
  wo.materials.push(m);
  const materials = wo.materials.reduce((s:any,c:any)=>s+(c.qty*c.unitPrice),0);
  const total = (wo.costSummary?.labor||0) + materials + (wo.costSummary?.other||0);
  wo.costSummary = { ...(wo.costSummary||{}), materials, total };
  await wo.save();
  return NextResponse.json(wo.materials);
}

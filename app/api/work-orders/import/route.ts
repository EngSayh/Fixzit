import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { WorkOrder } from "@/server/models/WorkOrder";
import { requireAbility } from "@/server/middleware/withAuthRbac";
import crypto from "crypto";

export async function POST(req:NextRequest){
  const user = await requireAbility("EDIT")(req);
  if (user instanceof NextResponse) return user as any;
  await connectToDatabase();
  const rows = (await req.json())?.rows as any[]; // expects parsed CSV rows from UI
  let created = 0;
  for (const r of rows ?? []){
    const code = `WO-${new Date().getFullYear()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
    await (WorkOrder as any).create({ tenantId:(user as any).orgId, code, title:r.title, description:r.description, priority:r.priority||"MEDIUM", createdBy:user.id, status:"SUBMITTED", statusHistory:[{from:"DRAFT",to:"SUBMITTED",byUserId:user.id,at:new Date()}] });
    created++;
  }
  return NextResponse.json({ created });
}


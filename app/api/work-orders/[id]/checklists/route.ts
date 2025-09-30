import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/src/lib/mongodb-unified";
import { WorkOrder } from "@/src/server/models/WorkOrder";
import { z } from "zod";
import { requireAbility } from "@/src/server/middleware/withAuthRbac";

const schema = z.object({ title:z.string().min(2), items:z.array(z.object({label:z.string().min(1), done:z.boolean().optional()})).default([]) });

export async function POST(req:NextRequest, props:{params: Promise<{id:string}>}) {
  const params = await props.params;
  const user = await requireAbility("EDIT")(req);
  if (user instanceof NextResponse) return user as any;
  await connectToDatabase();
  const data = schema.parse(await req.json());
  // Validate MongoDB ObjectId format
  if (!/^[a-fA-F0-9]{24}$/.test(params.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const wo:any = await (WorkOrder as any).findOne({ _id: params.id, tenantId: user.tenantId });
  if (!wo) return NextResponse.json({error:"Not found"},{status:404});
  wo.checklists.push({ title:data.title, items:data.items || [] });
  await wo.save();
  return NextResponse.json(wo.checklists);
}

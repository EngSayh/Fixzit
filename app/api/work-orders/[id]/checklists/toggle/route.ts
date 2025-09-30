import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { WorkOrder } from "@/server/models/WorkOrder";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

const schema = z.object({ checklistIndex:z.number().int().nonnegative(), itemIndex:z.number().int().nonnegative(), done:z.boolean() });

export async function POST(req:NextRequest, props:{params: Promise<{id:string}>}) {
  const params = await props.params;
  await connectToDatabase();const user = await getSessionUser(req);
  const { checklistIndex, itemIndex, done } = schema.parse(await req.json());
  const wo:any = await (WorkOrder as any).findOne({ _id: params.id, tenantId: user.tenantId });
  if (!wo) return NextResponse.json({error:"Not found"},{status:404});
  if (!wo.checklists?.[checklistIndex]?.items?.[itemIndex]) return NextResponse.json({error:"Bad index"},{status:400});
  wo.checklists[checklistIndex].items[itemIndex].done = done;
  await wo.save();
  return NextResponse.json(wo.checklists[checklistIndex]);
}

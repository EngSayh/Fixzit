import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/src/lib/mongo";
import { WorkOrder } from "@/src/server/models/WorkOrder";
import { z } from "zod";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";

const schema = z.object({ checklistIndex:z.number().int().nonnegative(), itemIndex:z.number().int().nonnegative(), done:z.boolean() });

export async function POST(req:NextRequest, {params}:{params:{id:string}}){
<<<<<<< HEAD
  await db; 
  const user = await getSessionUser(req);
  if (!user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Validate MongoDB ObjectId format
  if (!/^[a-fA-F0-9]{24}$/.test(params.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
=======
  await connectDb(); const _ = await getSessionUser(req);
>>>>>>> acecb620d9e960f6cc5af0795616effb28211e7b
  const { checklistIndex, itemIndex, done } = schema.parse(await req.json());
  const wo:any = await (WorkOrder as any).findOne({ _id: params.id, tenantId: user.tenantId });
  if (!wo) return NextResponse.json({error:"Not found"},{status:404});
  if (!wo.checklists?.[checklistIndex]?.items?.[itemIndex]) return NextResponse.json({error:"Bad index"},{status:400});
  wo.checklists[checklistIndex].items[itemIndex].done = done;
  await wo.save();
  return NextResponse.json(wo.checklists[checklistIndex]);
}

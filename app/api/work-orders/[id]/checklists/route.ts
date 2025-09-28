import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/src/lib/mongo";
import { WorkOrder } from "@/src/server/models/WorkOrder";
import { z } from "zod";
import { requireAbility } from "@/src/server/middleware/withAuthRbac";

const schema = z.object({ title:z.string().min(2), items:z.array(z.object({label:z.string().min(1), done:z.boolean().optional()})).default([]) });

export async function POST(req:NextRequest, {params}:{params:{id:string}}){
  const user = await requireAbility("EDIT")(req);
  if (user instanceof NextResponse) return user as any;
  await connectDb();
  const data = schema.parse(await req.json());
  const wo:any = await (WorkOrder as any).findById(params.id);
  if (!wo) return NextResponse.json({error:"Not found"},{status:404});
  wo.checklists.push({ title:data.title, items:data.items || [] });
  await wo.save();
  return NextResponse.json(wo.checklists);
}

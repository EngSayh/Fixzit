import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { WorkOrder } from "@/server/models/WorkOrder";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

const schema = z.object({ text:z.string().min(1) });

export async function GET(req:NextRequest, props:{params: Promise<{id:string}>}) {
  const params = await props.params;
  const user = await getSessionUser(req);
  await connectToDatabase();
  const wo = await (WorkOrder as any).findOne({ _id: params.id, tenantId: user.tenantId });
  return NextResponse.json(wo?.comments ?? []);
}

export async function POST(req:NextRequest, props:{params: Promise<{id:string}>}) {
  const params = await props.params;
  const user = await getSessionUser(req);await connectToDatabase();
  const { text } = schema.parse(await req.json());
  const wo:any = await (WorkOrder as any).findOne({ _id: params.id, tenantId: user.tenantId });
  if (!wo) return NextResponse.json({error:"Not found"},{status:404});
  wo.comments ??= [];
  wo.comments.push({ byUserId:user.id, text: String(text).slice(0, 5000), at:new Date() });
  await wo.save();
  return NextResponse.json({ok:true});
}

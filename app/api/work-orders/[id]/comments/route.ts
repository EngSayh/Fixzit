import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/mongo";
import { WorkOrder } from "@/src/server/models/WorkOrder";
import { z } from "zod";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";

const schema = z.object({ text:z.string().min(1) });

export async function GET(req:NextRequest, {params}:{params:{id:string}}){
  await db;
  const user = await getSessionUser(req);
  if (!user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Validate MongoDB ObjectId format
  if (!/^[a-fA-F0-9]{24}$/.test(params.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const wo = await (WorkOrder as any).findOne({ _id: params.id, tenantId: user.tenantId });
  if (!wo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(wo?.comments ?? []);
}

export async function POST(req:NextRequest, {params}:{params:{id:string}}){
  const user = await getSessionUser(req); await db;
  if (!user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Validate MongoDB ObjectId format
  if (!/^[a-fA-F0-9]{24}$/.test(params.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const { text } = schema.parse(await req.json());
  const wo:any = await (WorkOrder as any).findOne({ _id: params.id, tenantId: user.tenantId });
  if (!wo) return NextResponse.json({error:"Not found"},{status:404});
  wo.comments ??= [];
  wo.comments.push({ byUserId:user.id, text: String(text).slice(0, 5000), at:new Date() });
  await wo.save();
  return NextResponse.json({ok:true});
}

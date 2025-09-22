import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/mongo";
import { WorkOrder } from "@/src/server/models/WorkOrder";
import { z } from "zod";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";

const schema = z.object({ text:z.string().min(1) });

export async function GET(_req:NextRequest, {params}:{params:{id:string}}){
  await db;
  const wo = await (WorkOrder as any).findById(params.id);
  return NextResponse.json(wo?.comments ?? []);
}

export async function POST(req:NextRequest, {params}:{params:{id:string}}){
  const user = await getSessionUser(req); await db;
  const { text } = schema.parse(await req.json());
  const wo:any = await (WorkOrder as any).findById(params.id);
  if (!wo) return NextResponse.json({error:"Not found"},{status:404});
  wo.comments ??= [];
  wo.comments.push({ byUserId:user.id, text, at:new Date() });
  await wo.save();
  return NextResponse.json({ok:true});
}

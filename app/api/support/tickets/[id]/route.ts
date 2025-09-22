import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/mongo";
import { SupportTicket } from "@/src/server/models/SupportTicket";
import { z } from "zod";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";

const patchSchema = z.object({
  status: z.enum(["New","Open","Waiting","Resolved","Closed"]).optional(),
  assigneeUserId: z.string().optional(),
  priority: z.enum(["Low","Medium","High","Urgent"]).optional()
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }){
  await db;
  const t = await (SupportTicket as any).findById(params.id);
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(t);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }){
  await db;
  const user = await getSessionUser(req);
  if (!["SUPER_ADMIN","SUPPORT","CORPORATE_ADMIN"].includes(user.role)){
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const data = patchSchema.parse(await req.json());
  const t = await (SupportTicket as any).findById(params.id);
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (data.status && t.status==="New" && !t.firstResponseAt) t.firstResponseAt = new Date();
  Object.assign(t, data);
  if (data.status==="Resolved") t.resolvedAt = new Date();
  await t.save();
  return NextResponse.json(t);
}

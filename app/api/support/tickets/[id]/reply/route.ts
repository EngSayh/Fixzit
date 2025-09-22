import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/mongo";
import { SupportTicket } from "@/src/server/models/SupportTicket";
import { z } from "zod";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";

const schema = z.object({ text: z.string().min(1) });

export async function POST(req: NextRequest, { params }: { params: { id: string } }){
  await db;
  const user = await getSessionUser(req).catch(()=>null);
  const body = schema.parse(await req.json());
  const t = await (SupportTicket as any).findById(params.id);
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // End user may reply only to own ticket; admins can reply to any
  const isAdmin = !!user && ["SUPER_ADMIN","SUPPORT","CORPORATE_ADMIN"].includes(user.role);
  const isOwner = !!user && t.createdByUserId === user.id;
  if (!isAdmin && !isOwner) return NextResponse.json({ error: "Forbidden"},{ status: 403 });

  t.messages.push({ byUserId: user?.id, byRole: isAdmin ? "ADMIN" : "USER", text: body.text, at: new Date() });
  if (t.status === "Waiting") t.status = "Open";
  await t.save();
  return NextResponse.json({ ok: true });
}

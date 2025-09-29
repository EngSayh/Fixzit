import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/src/lib/mongo";
import { SupportTicket } from "@/src/server/models/SupportTicket";
import { z } from "zod";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";

const schema = z.object({ text: z.string().min(1) });

export async function POST(req: NextRequest, { params }: { params: { id: string } }){
  await connectDb();
  const user = await getSessionUser(req).catch(()=>null);
  const body = schema.parse(await req.json());
  // Validate MongoDB ObjectId format
  if (!/^[a-fA-F0-9]{24}$/.test(params.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const t = await (SupportTicket as any).findOne({ 
    _id: params.id, 
    $or: [
      { orgId: user?.orgId },
      { createdByUserId: user?.id },
      // Allow admins to reply to any ticket
      ...(user && ["SUPER_ADMIN","SUPPORT","CORPORATE_ADMIN"].includes(user.role) ? [{}] : [])
    ]
  });
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

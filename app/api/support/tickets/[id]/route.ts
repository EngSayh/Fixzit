import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/src/lib/mongodb-unified";
import { SupportTicket } from "@/src/server/models/SupportTicket";
import { z } from "zod";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";

const patchSchema = z.object({
  status: z.enum(["New","Open","Waiting","Resolved","Closed"]).optional(),
  assigneeUserId: z.string().optional(),
  priority: z.enum(["Low","Medium","High","Urgent"]).optional()
});

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  await connectToDatabase();
  const t = await (SupportTicket as any).findById(params.id);
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(t);
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  await connectToDatabase();
  const user = await getSessionUser(req);
  if (!["SUPER_ADMIN","SUPPORT","CORPORATE_ADMIN"].includes(user.role)){
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const data = patchSchema.parse(await req.json());
  // Validate MongoDB ObjectId format
  if (!/^[a-fA-F0-9]{24}$/.test(params.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const t = await (SupportTicket as any).findOne({ 
    _id: params.id, 
    $or: [
      { orgId: user.orgId },
      // Allow admins to modify any ticket
      ...(["SUPER_ADMIN","SUPPORT","CORPORATE_ADMIN"].includes(user.role) ? [{}] : [])
    ]
  });
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (data.status && t.status==="New" && !t.firstResponseAt) t.firstResponseAt = new Date();
  Object.assign(t, data);
  if (data.status==="Resolved") t.resolvedAt = new Date();
  await t.save();
  return NextResponse.json(t);
}

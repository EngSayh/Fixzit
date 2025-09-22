import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/mongo";
import { WorkOrder } from "@/src/server/models/WorkOrder";
import { z } from "zod";
import { getSessionUser, requireAbility } from "@/src/server/middleware/withAuthRbac";

const schema = z.object({
  to: z.enum(["IN_PROGRESS","ON_HOLD","COMPLETED","VERIFIED","CLOSED","CANCELLED"]),
  note: z.string().optional()
});

export async function POST(req: NextRequest, { params }: { params: { id: string }}) {
  const user = await getSessionUser(req);
  await db;

  const body = schema.parse(await req.json());
  const wo = await (WorkOrder as any).findOne({ _id: params.id, tenantId: user.tenantId });
  if (!wo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Role gate by target state
  const need: Record<string,"STATUS"|"VERIFY"|"CLOSE"> = {
    IN_PROGRESS: "STATUS",
    ON_HOLD: "STATUS",
    COMPLETED: "STATUS",
    VERIFIED: "VERIFY",
    CLOSED: "CLOSE",
    CANCELLED: "STATUS",
  };
  const guard = need[body.to];
  const gate = await (await requireAbility(guard))(req);
  if (gate instanceof NextResponse) return gate as any;

  // Technician/Vendor can only move their own assignments
  if ((user.role === "TECHNICIAN" || user.role === "VENDOR") &&
      String(wo.assigneeUserId ?? wo.assigneeVendorId ?? "") !== user.id) {
    return NextResponse.json({ error: "Not your assignment" }, { status: 403 });
  }

  wo.statusHistory.push({ from: wo.status, to: body.to, byUserId: user.id, at: new Date(), note: body.note });
  wo.status = body.to as any;
  await wo.save();
  return NextResponse.json(wo);
}

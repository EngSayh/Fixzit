import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/mongo";
import { WorkOrder } from "@/src/server/models/WorkOrder";
import { z } from "zod";
import { requireAbility } from "@/src/server/middleware/withAuthRbac";

const schema = z.object({
  assigneeUserId: z.string().optional(),
  assigneeVendorId: z.string().optional()
}).refine(d => d.assigneeUserId || d.assigneeVendorId, "Provide an assignee");

export async function POST(req: NextRequest, { params }: { params: { id: string }}) {
  const user = await requireAbility("ASSIGN")(req);
  if (user instanceof NextResponse) return user as any;
  await db;

  const body = schema.parse(await req.json());

  // Respect explicit mock flag only
  const isMockDB = String(process.env.USE_MOCK_DB || '').toLowerCase() === 'true';

  let wo;
  if (isMockDB) {
    wo = await (WorkOrder as any).findOne({ _id: params.id, tenantId: user.tenantId });
    if (!wo) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Update directly on mock object
    wo.assigneeUserId = body.assigneeUserId;
    wo.assigneeVendorId = body.assigneeVendorId;
    if (wo.status === "SUBMITTED") {
      wo.statusHistory.push({ from: wo.status, to: "DISPATCHED", byUserId: user.id, at: new Date() });
      wo.status = "DISPATCHED";
    }
    wo.updatedAt = new Date();
  } else {
    wo = await (WorkOrder as any).findOne({ _id: params.id, tenantId: user.tenantId });
    if (!wo) return NextResponse.json({ error: "Not found" }, { status: 404 });

    wo.assigneeUserId = body.assigneeUserId;
    wo.assigneeVendorId = body.assigneeVendorId;
    if (wo.status === "SUBMITTED") {
      wo.statusHistory.push({ from: wo.status, to: "DISPATCHED", byUserId: user.id, at: new Date() });
      wo.status = "DISPATCHED";
    }
    await wo.save();
  }

  return NextResponse.json(wo);
}

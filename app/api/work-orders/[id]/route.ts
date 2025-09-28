import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/src/lib/mongo";
import { WorkOrder } from "@/src/server/models/WorkOrder";
import { z } from "zod";
import { requireAbility } from "@/src/server/middleware/withAuthRbac";
import { resolveSlaTarget, WorkOrderPriority } from "@/src/lib/sla";
import { WOPriority } from "@/src/server/work-orders/wo.schema";

<<<<<<< HEAD
export async function GET(req: NextRequest, { params }: { params: { id: string }}) {
  await db;
  const user = await requireAbility("VIEW")(req);
  if (user instanceof NextResponse) return user as any;
  if (!user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Validate MongoDB ObjectId format
  if (!/^[a-fA-F0-9]{24}$/.test(params.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const wo = await (WorkOrder as any).findOne({ _id: params.id, tenantId: user.tenantId });
=======
export async function GET(_req: NextRequest, { params }: { params: { id: string }}) {
  await connectDb();
  const wo = await (WorkOrder as any).findById(params.id);
>>>>>>> acecb620d9e960f6cc5af0795616effb28211e7b
  if (!wo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(wo);
}

const patchSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  priority: WOPriority.optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  dueAt: z.string().datetime().optional()
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string }}) {
  const user = await requireAbility("EDIT")(req);
  if (user instanceof NextResponse) return user as any;
  await connectDb();
  const updates = patchSchema.parse(await req.json());
  const updatePayload: Record<string, any> = { ...updates };

  if (updates.priority) {
    const { slaMinutes, dueAt } = resolveSlaTarget(updates.priority as WorkOrderPriority);
    updatePayload.slaMinutes = slaMinutes;
    if (!updates.dueAt) {
      updatePayload.dueAt = dueAt;
    }
  }

  if (updates.dueAt) {
    updatePayload.dueAt = new Date(updates.dueAt);
  }

  const wo = await (WorkOrder as any).findOneAndUpdate(
    { _id: params.id, tenantId: user.tenantId },
    { $set: updatePayload },
    { new: true }
  );
  if (!wo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(wo);
}
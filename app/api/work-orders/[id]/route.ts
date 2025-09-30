import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { WorkOrder } from "@/server/models/WorkOrder";
import { z } from "zod";
import { requireAbility } from "@/server/middleware/withAuthRbac";
import { resolveSlaTarget, WorkOrderPriority } from "@/lib/sla";
import { WOPriority } from "@/server/work-orders/wo.schema";

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }>}) {
  const params = await props.params;
  await connectToDatabase();
  const wo = await (WorkOrder as any).findById(params.id);
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

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }>}) {
  const params = await props.params;
  const user = await requireAbility("EDIT")(req);
  if (user instanceof NextResponse) return user as any;
  await connectToDatabase();
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
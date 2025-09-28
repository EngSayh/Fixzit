import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/src/lib/mongo";
import { WorkOrder } from "@/src/server/models/WorkOrder";
import { z } from "zod";
import { getSessionUser, requireAbility } from "@/src/server/middleware/withAuthRbac";

export async function GET(_req: NextRequest, { params }: { params: { id: string }}) {
  await connectDb();
  const wo = await (WorkOrder as any).findById(params.id);
  if (!wo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(wo);
}

const patchSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  priority: z.enum(["LOW","MEDIUM","HIGH","URGENT"]).optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  dueAt: z.string().datetime().optional()
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string }}) {
  const user = await requireAbility("EDIT")(req);
  if (user instanceof NextResponse) return user as any;
  await connectDb();
  const updates = patchSchema.parse(await req.json());
  const wo = await (WorkOrder as any).findOneAndUpdate(
    { _id: params.id, tenantId: user.tenantId },
    { $set: { ...updates } },
    { new: true }
  );
  if (!wo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(wo);
}
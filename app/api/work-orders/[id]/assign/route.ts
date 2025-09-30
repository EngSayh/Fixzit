import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/src/lib/mongodb-unified";
import { WorkOrder } from "@/src/server/models/WorkOrder";
import { z } from "zod";
import { requireAbility } from "@/src/server/middleware/withAuthRbac";

const schema = z.object({
  assigneeUserId: z.string().optional(),
  assigneeVendorId: z.string().optional()
}).refine(d => d.assigneeUserId || d.assigneeVendorId, "Provide an assignee");

/**
 * Assigns a work order to a user and/or vendor and returns the updated work order.
 *
 * Validates request body, enforces the caller has the "ASSIGN" ability, looks up the work order
 * by route `params.id` and the caller's tenant, updates assignee fields, and if the work order
 * was in "SUBMITTED" state records a status transition to "DISPATCHED". Changes are persisted to MongoDB.
 *
 * @param req - Incoming Next.js request (must include JSON body matching the handler schema).
 * @param params - Route params object; `params.id` is the work order `_id` to update.
 * @returns A NextResponse containing the JSON-serialized updated work order, or a 404 JSON response if not found.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string }}) {
  const user = await requireAbility("ASSIGN")(req);
  if (user instanceof NextResponse) return user as any;
  await connectToDatabase();

  const body = schema.parse(await req.json());

  // MongoDB-only implementation
  let wo = await (WorkOrder as any).findOne({ _id: params.id, tenantId: user.tenantId });
  if (!wo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  wo.assigneeUserId = body.assigneeUserId;
  wo.assigneeVendorId = body.assigneeVendorId;
  if (wo.status === "SUBMITTED") {
    wo.statusHistory.push({ from: wo.status, to: "DISPATCHED", byUserId: user.id, at: new Date() });
    wo.status = "DISPATCHED";
  }
  await wo.save();

  return NextResponse.json(wo);
}

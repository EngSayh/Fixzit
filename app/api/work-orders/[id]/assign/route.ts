import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/mongo";
import { WorkOrder } from "@/src/server/models/WorkOrder";
import { z } from "zod";
import { requireAbility } from "@/src/server/middleware/withAuthRbac";

const schema = z.object({
  assigneeUserId: z.string().optional(),
  assigneeVendorId: z.string().optional()
}).refine(d => d.assigneeUserId || d.assigneeVendorId, "Provide an assignee");

/**
 * Assigns a work order to a user or vendor.
 *
 * Validates the request body (requires at least one of `assigneeUserId` or `assigneeVendorId`), ensures the caller has the "ASSIGN" ability, loads the work order by `params.id` and the caller's tenant, applies the assignee fields, and persists the change. If the work order's current status is `"SUBMITTED"`, a statusHistory entry is appended and the status is transitioned to `"DISPATCHED"`.
 *
 * @param params - Route params; `params.id` is the work order `_id` to update.
 * @returns A NextResponse containing the updated work order on success. May return an RBAC response if the caller lacks permission, or a 404 JSON response `{ error: "Not found" }` if the work order does not exist for the caller's tenant.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string }}) {
  const user = await requireAbility("ASSIGN")(req);
  if (user instanceof NextResponse) return user as any;
  await db;

  const body = schema.parse(await req.json());

  let wo;
  wo = await (WorkOrder as any).findOne({ _id: params.id, tenantId: user.tenantId });
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

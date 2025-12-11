/**
 * @fileoverview Work Order Checklist Toggle API Route
 * @description Toggle completion status of individual checklist items.
 * Used by technicians to mark tasks as done during work execution.
 * @route POST /api/work-orders/[id]/checklists/toggle - Toggle checklist item
 * @access Protected - Requires authenticated session
 * @module work-orders
 */
import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { WorkOrder } from "@/server/models/WorkOrder";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

import { createSecureResponse } from "@/server/security/headers";

const schema = z.object({
  checklistIndex: z.number().int().nonnegative(),
  itemIndex: z.number().int().nonnegative(),
  done: z.boolean(),
});

/**
 * @openapi
 * /api/work-orders/[id]/checklists/toggle:
 *   get:
 *     summary: work-orders/[id]/checklists/toggle operations
 *     tags: [work-orders]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  await connectToDatabase();
  const user = await getSessionUser(req);
  const { id } = await props.params;
  const { checklistIndex, itemIndex, done } = schema.parse(await req.json());
  interface WorkOrderDoc {
    checklists?: Array<{
      items?: Array<{ done: boolean }>;
    }>;
    save: () => Promise<void>;
  }
  const wo = (await WorkOrder.findOne({
    _id: id,
    tenantId: user.tenantId,
  })) as WorkOrderDoc | null;
  if (!wo) return createSecureResponse({ error: "Not found" }, 404, req);
  if (!wo.checklists?.[checklistIndex]?.items?.[itemIndex])
    return createSecureResponse({ error: "Bad index" }, 400, req);
  wo.checklists[checklistIndex].items[itemIndex].done = done;
  await wo.save();
  return createSecureResponse(wo.checklists[checklistIndex], 200, req);
}

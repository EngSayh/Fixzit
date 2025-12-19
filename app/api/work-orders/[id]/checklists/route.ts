/**
 * @fileoverview Work Order Checklists API Route
 * @description Manage QA/task checklists for work orders. Supports creating
 * checklists with multiple items for quality assurance and task tracking.
 * @route POST /api/work-orders/[id]/checklists - Add a checklist to work order
 * @access Protected - Requires EDIT ability on work orders
 * @module work-orders
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { WorkOrder } from "@/server/models/WorkOrder";
import { z } from "zod";
import { requireAbility } from "@/server/middleware/withAuthRbac";
import { WOAbility } from "@/types/work-orders/abilities";

import { createSecureResponse } from "@/server/security/headers";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const schema = z.object({
  title: z.string().min(2),
  items: z
    .array(z.object({ label: z.string().min(1), done: z.boolean().optional() }))
    .default([]),
});

interface WorkOrderDoc {
  checklists: Array<{
    title: string;
    items: Array<{ label: string; done?: boolean }>;
  }>;
  save: () => Promise<void>;
}

/**
 * @openapi
 * /api/work-orders/[id]/checklists:
 *   get:
 *     summary: work-orders/[id]/checklists operations
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
): Promise<NextResponse> {
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "work-orders-checklists:post",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const user = await requireAbility(WOAbility.EDIT)(req);
    if (user instanceof NextResponse) return user;
    const { id } = await props.params;
    await connectToDatabase();
    const data = schema.parse(await req.json());
    // Validate MongoDB ObjectId format
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return createSecureResponse({ error: "Invalid id" }, 400, req);
    }
    // NO_LEAN: document required for checklist updates and save()
    // eslint-disable-next-line local/require-lean
    const wo = (await WorkOrder.findOne({
      _id: id,
      tenantId: user.tenantId,
    })) as WorkOrderDoc | null;
    if (!wo) return createSecureResponse({ error: "Not found" }, 404, req);
    wo.checklists.push({ title: data.title, items: data.items || [] });
    await wo.save();
    return createSecureResponse(wo.checklists, 200, req);
  } catch (error) {
    logger.error("[work-orders/checklists] POST error", { error });
    return createSecureResponse({ error: "Failed to add checklist" }, 500, req);
  }
}

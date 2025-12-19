/**
 * @fileoverview Work Order Materials API Route
 * @description Manage materials/parts used in work orders for cost tracking.
 * Adds materials with pricing, updates cost summary with labor and material totals.
 * @route POST /api/work-orders/[id]/materials - Add a material item to work order
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

const upsertSchema = z.object({
  sku: z.string().optional(),
  name: z.string(),
  qty: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  currency: z.string().default("SAR"),
});

/**
 * @openapi
 * /api/work-orders/[id]/materials:
 *   get:
 *     summary: work-orders/[id]/materials operations
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
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "work-orders-materials:post",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const user = await requireAbility(WOAbility.EDIT)(req);
    if (user instanceof NextResponse) return user;
    await connectToDatabase();
    const m = upsertSchema.parse(await req.json());
    // Validate MongoDB ObjectId format
    if (!/^[a-fA-F0-9]{24}$/.test(params.id)) {
      return createSecureResponse({ error: "Invalid id" }, 400, req);
    }
    interface Material {
      sku?: string;
      name: string;
      qty: number;
      unitPrice: number;
      currency: string;
    }
    interface WorkOrderDoc {
      materials: Material[];
      costSummary?: {
        labor?: number;
        materials?: number;
        other?: number;
        total?: number;
      };
      save: () => Promise<void>;
    }
    // NO_LEAN: document required for materials update and save()
    const wo = (await WorkOrder.findOne({
      _id: params.id,
      tenantId: user.tenantId,
    })) as WorkOrderDoc | null;
    if (!wo) return createSecureResponse({ error: "Not found" }, 404, req);
    wo.materials.push(m);
    const materials = wo.materials.reduce((s, c) => s + c.qty * c.unitPrice, 0);
    const total =
      (wo.costSummary?.labor || 0) + materials + (wo.costSummary?.other || 0);
    wo.costSummary = { ...(wo.costSummary || {}), materials, total };
    await wo.save();
    return createSecureResponse(wo.materials, 200, req);
  } catch (error) {
    logger.error("[work-orders/materials] POST error", { error });
    return createSecureResponse({ error: "Failed to add material" }, 500, req);
  }
}

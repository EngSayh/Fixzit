import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { WorkOrder } from "@/server/models/WorkOrder";
import { z } from "zod";
import { requireAbility } from "@/server/middleware/withAuthRbac";

import { createSecureResponse } from '@/server/security/headers';

const upsertSchema = z.object({ sku:z.string().optional(), name:z.string(), qty:z.number().positive(), unitPrice:z.number().nonnegative(), currency:z.string().default("SAR") });

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
export async function POST(req:NextRequest, props:{params: Promise<{id:string}>}): Promise<NextResponse> {
  const params = await props.params;
  const user = await requireAbility("EDIT")(req);
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
    costSummary?: { labor?: number; materials?: number; other?: number; total?: number };
    save: () => Promise<void>;
  }
  const wo = (await WorkOrder.findOne({ _id: params.id, tenantId: user.tenantId })) as WorkOrderDoc | null;
  if (!wo) return createSecureResponse({error:"Not found"}, 404, req);
  wo.materials.push(m);
  const materials = wo.materials.reduce((s, c) => s + (c.qty * c.unitPrice), 0);
  const total = (wo.costSummary?.labor||0) + materials + (wo.costSummary?.other||0);
  wo.costSummary = { ...(wo.costSummary||{}), materials, total };
  await wo.save();
  return createSecureResponse(wo.materials, 200, req);
}

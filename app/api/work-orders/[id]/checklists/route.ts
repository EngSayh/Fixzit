import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { WorkOrder } from "@/server/models/WorkOrder";
import { z } from "zod";
import { requireAbility } from "@/server/middleware/withAuthRbac";
import { WOAbility } from "@/types/work-orders/abilities";

import { createSecureResponse } from '@/server/security/headers';

const schema = z.object({ title:z.string().min(2), items:z.array(z.object({label:z.string().min(1), done:z.boolean().optional()})).default([]) });

interface WorkOrderDoc {
  checklists: Array<{ title: string; items: Array<{ label: string; done?: boolean }> }>;
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
export async function POST(req:NextRequest, props:{params: Promise<{id:string}>}): Promise<NextResponse> {
  const params = await props.params;
  const user = await requireAbility(WOAbility.EDIT)(req);
  if (user instanceof NextResponse) return user;
  await connectToDatabase();
  const data = schema.parse(await req.json());
  // Validate MongoDB ObjectId format
  if (!/^[a-fA-F0-9]{24}$/.test(params.id)) {
    return createSecureResponse({ error: "Invalid id" }, 400, req);
  }
  const wo = (await WorkOrder.findOne({ _id: params.id, tenantId: user.tenantId })) as WorkOrderDoc | null;
  if (!wo) return createSecureResponse({error:"Not found"}, 404, req);
  wo.checklists.push({ title:data.title, items:data.items || [] });
  await wo.save();
  return createSecureResponse(wo.checklists, 200, req);
}

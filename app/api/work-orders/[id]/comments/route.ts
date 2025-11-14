import { NextRequest} from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { WorkOrder } from "@/server/models/WorkOrder";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

import { createSecureResponse } from '@/server/security/headers';

const schema = z.object({ text:z.string().min(1) });

/**
 * @openapi
 * /api/work-orders/[id]/comments:
 *   get:
 *     summary: work-orders/[id]/comments operations
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
export async function GET(req:NextRequest, props:{params: Promise<{id:string}>}) {
  const params = await props.params;
  const user = await getSessionUser(req);
  await connectToDatabase();
  const wo = (await WorkOrder.findOne({ _id: params.id, tenantId: user.tenantId })) as any;
  return createSecureResponse(wo?.comments ?? [], 200, req);
}

export async function POST(req:NextRequest, props:{params: Promise<{id:string}>}) {
  const params = await props.params;
  const user = await getSessionUser(req);await connectToDatabase();
  const { text } = schema.parse(await req.json());
  interface WorkOrderDoc {
    comments?: Array<{ byUserId: string; text: string; at: Date }>;
    save: () => Promise<void>;
  }
  const wo = (await WorkOrder.findOne({ _id: params.id, tenantId: user.tenantId })) as WorkOrderDoc | null;
  if (!wo) return createSecureResponse({error:"Not found"}, 404, req);
  wo.comments ??= [];
  wo.comments.push({ byUserId:user.id, text: String(text).slice(0, 5000), at:new Date() });
  await wo.save();
  return createSecureResponse({ok:true}, 200, req);
}

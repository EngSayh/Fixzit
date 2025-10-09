import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { WorkOrder } from "@/server/models/WorkOrder";
import { z } from "zod";
import { getSessionUser, requireAbility } from "@/server/middleware/withAuthRbac";

import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

const schema = z.object({
  to: z.enum(["IN_PROGRESS","ON_HOLD","COMPLETED","VERIFIED","CLOSED","CANCELLED"]),
  note: z.string().optional()
});

/**
 * @openapi
 * /api/work-orders/[id]/status:
 *   get:
 *     summary: work-orders/[id]/status operations
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
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }>}): Promise<NextResponse> {
  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60);
  if (!rl.allowed) {
    return rateLimitError();
  }

  const params = await props.params;
  const user = await getSessionUser(req);
  await connectToDatabase();

  const body = schema.parse(await req.json());
  const wo = await WorkOrder.findOne({ _id: params.id, tenantId: user.tenantId });
  if (!wo) return createSecureResponse({ error: "Not found" }, 404, req);

  // Role gate by target state
  const need: Record<string,"STATUS"|"VERIFY"|"CLOSE"> = {
    IN_PROGRESS: "STATUS",
    ON_HOLD: "STATUS",
    COMPLETED: "STATUS",
    VERIFIED: "VERIFY",
    CLOSED: "CLOSE",
    CANCELLED: "STATUS"};
  const guard = need[body.to];
  const gate = await (await requireAbility(guard))(req);
  if (gate instanceof NextResponse) return gate;

  // Technician/Vendor can only move their own assignments
  if ((user.role === "TECHNICIAN" || user.role === "VENDOR") &&
      String(wo.assigneeUserId ?? wo.assigneeVendorId ?? "") !== user.id) {
    return createSecureResponse({ error: "Not your assignment" }, 403, req);
  }

  wo.statusHistory.push({ from: wo.status, to: body.to, byUserId: user.id, at: new Date(), note: body.note });
  wo.status = body.to as any;
  await wo.save();
  return createSecureResponse(wo, 200, req);
}

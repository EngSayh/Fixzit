import { NextRequest} from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { SupportTicket } from "@/server/models/SupportTicket";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

import { createSecureResponse } from '@/server/security/headers';

const patchSchema = z.object({
  status: z.enum(["New","Open","Waiting","Resolved","Closed"]).optional(),
  assigneeUserId: z.string().optional(),
  priority: z.enum(["Low","Medium","High","Urgent"]).optional()
});

/**
 * @openapi
 * /api/support/tickets/[id]:
 *   get:
 *     summary: support/tickets/[id] operations
 *     tags: [support]
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
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  await connectToDatabase();
  // @ts-ignore - Mongoose type inference issue with conditional model export
  const t = (await SupportTicket.findById(params.id)) as any;
  if (!t) return createSecureResponse({ error: "Not found" }, 404, _req);
  return createSecureResponse(t, 200, _req);
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  await connectToDatabase();
  const user = await getSessionUser(req);
  if (!["SUPER_ADMIN","SUPPORT","CORPORATE_ADMIN"].includes(user.role)){
    return createSecureResponse({ error: "Forbidden" }, 403, req);
  }
  const data = patchSchema.parse(await req.json());
  // Validate MongoDB ObjectId format
  if (!/^[a-fA-F0-9]{24}$/.test(params.id)) {
    return createSecureResponse({ error: "Invalid id" }, 400, req);
  }
  const t = (await SupportTicket.findOne({ 
    _id: params.id, 
    $or: [
      { orgId: user.orgId },
      // Allow admins to modify any ticket
      ...(["SUPER_ADMIN","SUPPORT","CORPORATE_ADMIN"].includes(user.role) ? [{}] : [])
    ]
  })) as any;
  if (!t) return createSecureResponse({ error: "Not found" }, 404, req);
  if (data.status && t.status==="New" && !t.firstResponseAt) t.firstResponseAt = new Date();
  Object.assign(t, data);
  if (data.status==="Resolved") t.resolvedAt = new Date();
  await t.save();
  return createSecureResponse(t, 200, req);
}

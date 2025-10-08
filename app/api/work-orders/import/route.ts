import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { WorkOrder } from "@/server/models/WorkOrder";
import { getSessionUser, requireAbility } from "@/server/middleware/withAuthRbac";

import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, forbiddenError, notFoundError, validationError, zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

/**
 * @openapi
 * /api/work-orders/import:
 *   get:
 *     summary: work-orders/import operations
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
export async function POST(req:NextRequest){
  const user = await requireAbility("EDIT")(req);
  if (user instanceof NextResponse) return user as any;
  await connectToDatabase();
  const rows = (await req.json())?.rows as any[]; // expects parsed CSV rows from UI
  let created = 0;
  for (const r of rows ?? []){
    const code = `WO-${new Date().getFullYear()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
    await (WorkOrder as any).create({ tenantId:user.orgId, code, title:r.title, description:r.description, priority:r.priority||"MEDIUM", createdBy:user.id, status:"SUBMITTED", statusHistory:[{from:"DRAFT",to:"SUBMITTED",byUserId:user.id,at:new Date()}] });
    created++;
  }
  return createSecureResponse({ created }, 200, req);
}



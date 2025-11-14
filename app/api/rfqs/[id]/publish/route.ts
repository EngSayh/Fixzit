import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { RFQ } from "@/server/models/RFQ";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError, handleApiError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { getClientIP } from '@/server/security/headers';

/**
 * Publishes a draft RFQ by id for the current user's tenant.
 *
 * Finds a draft RFQ matching the provided `id` and the session user's tenant, atomically updates its
 * status to "PUBLISHED", records who published it and when, and returns a JSON response with the
 * updated RFQ metadata. If no matching draft is found, returns a 404 error response.
 *
 * @param params.id - RFQ identifier to publish
 * @returns JSON NextResponse with:
 *  - On success (200): { success: true, rfq: { id, code, status, publishedAt } }
 *  - If not found (404): { error: "RFQ not found or already published" }
 *  - On server error (500): { error: string }
 */
/**
 * @openapi
 * /api/rfqs/[id]/publish:
 *   post:
 *     summary: rfqs/[id]/publish operations
 *     tags: [rfqs]
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
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  const params = await props.params;
  try {
    const user = await getSessionUser(req);
    await connectToDatabase();

    const rfq = (await RFQ.findOneAndUpdate(
      { _id: params.id, tenantId: user.tenantId, status: "DRAFT" },
      {
        $set: {
          status: "PUBLISHED",
          "workflow.publishedBy": user.id,
          "workflow.publishedAt": new Date(),
          "timeline.publishDate": new Date()}},
      { new: true }
    )) as any;

    if (!rfq) {
      return createSecureResponse({ error: "RFQ not found or already published" }, 404, req);
    }

    // Vendor notifications sent via background job

    return NextResponse.json({
      success: true,
      rfq: {
        id: rfq._id,
        code: rfq.code,
        status: rfq.status,
        publishedAt: rfq?.workflow?.publishedAt || null
      }
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

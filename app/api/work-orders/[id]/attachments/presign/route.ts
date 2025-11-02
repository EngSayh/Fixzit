import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from '@/server/middleware/withAuthRbac';

// Stub: return a fake PUT URL that your frontend will use; replace with S3/GCS logic.
/**
 * @openapi
 * /api/work-orders/[id]/attachments/presign:
 *   get:
 *     summary: work-orders/[id]/attachments/presign operations
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
export async function POST(req:NextRequest, props:{params: Promise<{id:string}>}) {
  const params = await props.params;
  await getSessionUser(req); // Authentication check
  const body = await req.json();
  const fileName = encodeURIComponent(body?.name || "upload.bin");
  const putUrl = `http://localhost:3000/api/dev-null-upload?name=${fileName}`; // replace with real presign
  return NextResponse.json({ putUrl, key:`wo/${params.id}/${fileName}` });
}


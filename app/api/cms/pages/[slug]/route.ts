import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { CmsPage } from "@/server/models/CmsPage";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

import {notFoundError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

/**
 * @openapi
 * /api/cms/pages/[slug]:
 *   get:
 *     summary: cms/pages/[slug] operations
 *     tags: [cms]
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
export async function GET(_req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  await connectToDatabase();
  const page = await CmsPage.findOne({ slug: params.slug }).lean();
  if (!page) return createSecureResponse({ error: "Not found" }, 404, _req);
  return createSecureResponse(page, 200, _req);
}

const patchSchema = z.object({
  title: z.string().min(2).optional(),
  content: z.string().min(1).optional(),
  status: z.enum(["DRAFT","PUBLISHED"]).optional()
});

export async function PATCH(req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  await connectToDatabase();
  const user = await getSessionUser(req).catch(()=>null);
  if (!user || !["SUPER_ADMIN","CORPORATE_ADMIN"].includes(user.role)) {
    return createSecureResponse({ error: "Forbidden" }, 403, req);
  }
  
  const body = await req.json();
  const validated = patchSchema.parse(body);
  const page = (await CmsPage.findOneAndUpdate(
    { slug: params.slug },
    { $set: validated },
    { new: true }
  ));
  if (!page) return notFoundError("Resource");
  return NextResponse.json(page);
}

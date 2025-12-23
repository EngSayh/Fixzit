import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { CmsPage } from "@/server/models/CmsPage";
import { z } from "zod";
import { getSessionOrNull } from "@/lib/auth/safe-session";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

import { notFoundError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";

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
export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ slug: string }> },
) {
  enforceRateLimit(_req, { requests: 120, windowMs: 60_000, keyPrefix: "cms:pages" });
  try {
    await connectToDatabase();
    const { slug } = await props.params;
    // eslint-disable-next-line local/require-tenant-scope -- PLATFORM-WIDE: CMS pages are global content, not tenant-scoped
    const page = await CmsPage.findOne({ slug }).lean();
    if (!page) return createSecureResponse({ error: "Not found" }, 404, _req);
    const response = createSecureResponse(page, 200, _req);
    // Cache CMS pages for 5 minutes - static content
    response.headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    return response;
  } catch (_error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const patchSchema = z.object({
  title: z.string().min(2).optional(),
  content: z.string().min(1).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ slug: string }> },
) {
  try {
    await connectToDatabase();
    const { slug } = await props.params;
    const sessionResult = await getSessionOrNull(req, { route: "cms:pages:update" });
    if (!sessionResult.ok) {
      return sessionResult.response; // 503 on infra error
    }
    const user = sessionResult.session;
    if (!user || !["SUPER_ADMIN", "CORPORATE_ADMIN"].includes(user.role)) {
      return createSecureResponse({ error: "Forbidden" }, 403, req);
    }

    const body = await req.json();
    const validated = patchSchema.parse(body);
    // eslint-disable-next-line local/require-tenant-scope -- PLATFORM-WIDE: CMS pages are global content, only SUPER_ADMIN/CORPORATE_ADMIN can edit
    const page = await CmsPage.findOneAndUpdate(
      { slug },
      { $set: validated },
      { new: true },
    );
    if (!page) return notFoundError("Resource");
    return NextResponse.json(page);
  } catch (_error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

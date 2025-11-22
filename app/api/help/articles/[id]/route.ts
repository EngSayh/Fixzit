import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { getDatabase } from "@/lib/mongodb-unified";
import { ObjectId } from "mongodb";

import { validationError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

import { logger } from '@/lib/logger';
const patchSchema = z.object({
  title: z.string().min(2).optional(),
  content: z.string().min(1).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["DRAFT","PUBLISHED"]).optional()
});

/**
 * HTTP PATCH handler that updates a help article.
 *
 * Validates the request body against `patchSchema`, requires the caller to have the `SUPER_ADMIN` role,
 * and updates the matching document in the `helparticles` collection. The handler accepts an article
 * identifier (`params.id`) that may be either a MongoDB ObjectId or a slug; it first tries to treat
 * `params.id` as an ObjectId and falls back to matching `slug` if parsing fails. The update sets the
 * provided fields plus `updatedBy` (current user id) and `updatedAt` (current timestamp).
 *
 * Returns a JSON NextResponse containing the updated article on success, a 403 response if the user
 * is not authorized, or a 404 response if no article matches the identifier.
 *
 * @param params.id - Article identifier; either a MongoDB ObjectId string or a slug.
 */
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    // Handle authentication separately to return 401 instead of 500
    let user;
    try {
      user = await getSessionUser(req);
    } catch (authError) {
      // Log only sanitized error message to avoid exposing sensitive data
      logger.error('Authentication failed:', authError instanceof Error ? authError.message : 'Unknown error');
      return createSecureResponse({ error: 'Unauthorized' }, 401, req);
    }
    
    const body = await req.json().catch(() => ({}));
    const data = patchSchema.parse(body);
    const db = await getDatabase();
    const coll = db.collection('helparticles');

    const baseFilter = (() => {
      try { return { _id: new ObjectId(params.id) }; } catch { return { slug: params.id }; }
    })();
    // Scope updates to caller's tenant or global articles
    const tenantScope = { $or: [ { orgId: user.orgId }, { orgId: { $exists: false } }, { orgId: null } ] };
    const filter = { ...baseFilter, ...tenantScope };

    const article = await coll.findOne(filter);
    if (!article) return createSecureResponse({ error: "Not found" }, 404, req);

    const isSuperAdmin = user?.role === 'SUPER_ADMIN' || (Array.isArray(user?.roles) && user.roles.includes('SUPER_ADMIN'));
    const canModerate = isSuperAdmin || (Array.isArray(user?.permissions) && user.permissions.includes('help:moderate'));

    // Only SUPER_ADMIN (or explicit help:moderate) can publish or change published content
    if (!canModerate) {
      if (data.status === 'PUBLISHED') {
        return createSecureResponse({ error: 'Only SUPER_ADMIN can publish articles' }, 403, req);
      }
      if (article.status === 'PUBLISHED') {
        return createSecureResponse({ error: 'Only SUPER_ADMIN can modify published articles' }, 403, req);
      }
    }

    const update = {
      $set: {
        ...data,
        updatedBy: user.id,
        updatedAt: new Date()
      }
    };

    const res = await coll.findOneAndUpdate(filter, update, { returnDocument: 'after' });
    const updatedArticle = res?.value || null;
    if (!updatedArticle) return createSecureResponse({ error: "Not found" }, 404, req);
    // Trigger async KB ingest (best-effort) via internal helper to avoid auth issues
    import('@/kb/ingest')
      .then(({ upsertArticleEmbeddings }) => upsertArticleEmbeddings({
        orgId: updatedArticle?.orgId ?? user?.orgId ?? null,
        articleId: updatedArticle.slug,
        lang: 'en',
        route: `/help/${updatedArticle.slug}`,
        roleScopes: ['USER'],
        content: updatedArticle.content || ''
      }))
      .catch((e) => logger.error(`Failed to trigger KB ingest for article ${updatedArticle.slug}:`, e));
    const response = NextResponse.json(updatedArticle);
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (_err: unknown) {
    if (_err && typeof _err === 'object' && 'name' in _err && _err.name === 'ZodError' && 'issues' in _err) {
      return validationError('Validation failed', _err.issues as Array<{message: string}>);
    }
    if (_err && typeof _err === 'object' && 'code' in _err && _err.code === 11000) {
      return createSecureResponse({ error: 'Duplicate key (e.g., slug) exists' }, 409, req);
    }
    logger.error(
      'PATCH /api/help/articles/[id] failed',
      _err instanceof Error ? _err : new Error(String(_err)),
      { route: 'PATCH /api/help/articles/[id]' }
    );
    return createSecureResponse({ error: 'Internal Server Error' }, 500, req);
  }
}

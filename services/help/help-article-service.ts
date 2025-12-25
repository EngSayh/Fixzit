/**
 * @module services/help/help-article-service
 * @description Service layer for Help Articles with org-scoped operations.
 * Provides CRUD operations and helpers for tenant-isolated help content.
 * 
 * TD-001: Created to migrate db.collection() calls to Mongoose models
 */
import { HelpArticle, type HelpArticleDoc } from "@/server/models/HelpArticle";
import { FilterQuery, Types } from "mongoose";

export interface HelpArticleFilters {
  category?: string;
  status?: "DRAFT" | "PUBLISHED" | "ALL";
  locale?: "en" | "ar";
  q?: string;
  page?: number;
  limit?: number;
}

export interface HelpArticleBasicInfo {
  orgId: string | null;
  slug: string;
  status: string;
}

/**
 * Build tenant scope filter that allows:
 * - User's own org articles
 * - Global articles (orgId null or missing)
 */
function buildTenantScope(orgId?: string): FilterQuery<HelpArticleDoc> {
  const orClauses: FilterQuery<HelpArticleDoc>[] = [
    { orgId: { $exists: false } },
    { orgId: null },
  ];
  if (orgId) {
    orClauses.unshift({ orgId });
  }
  return { $or: orClauses };
}

export const helpArticleService = {
  /**
   * Get basic article info for existence/ownership checks
   * TD-001: Replacement for db.collection().findOne() pre-checks
   */
  async getArticleBasicInfo(
    idOrSlug: string,
    orgId?: string
  ): Promise<HelpArticleBasicInfo | null> {
    const tenantScope = buildTenantScope(orgId);
    
    // Try as ObjectId first, then slug
    let filter: FilterQuery<HelpArticleDoc>;
    if (Types.ObjectId.isValid(idOrSlug)) {
      filter = { _id: new Types.ObjectId(idOrSlug), ...tenantScope };
    } else {
      filter = { slug: idOrSlug, ...tenantScope };
    }
    
    // Note: orgId comes from tenantIsolation plugin, not in base schema type
    const article = await HelpArticle.findOne(filter)
      .select("orgId slug status")
      .lean() as (HelpArticleDoc & { orgId?: string }) | null;
    
    if (!article) return null;
    
    return {
      orgId: article.orgId ?? null,
      slug: article.slug,
      status: article.status ?? "PUBLISHED",
    };
  },

  /**
   * Get article by ID or slug with full details
   */
  async getArticle(
    idOrSlug: string,
    orgId?: string
  ): Promise<HelpArticleDoc | null> {
    const tenantScope = buildTenantScope(orgId);
    
    let filter: FilterQuery<HelpArticleDoc>;
    if (Types.ObjectId.isValid(idOrSlug)) {
      filter = { _id: new Types.ObjectId(idOrSlug), ...tenantScope };
    } else {
      filter = { slug: idOrSlug, ...tenantScope };
    }
    
    return HelpArticle.findOne(filter).lean();
  },

  /**
   * List articles with filtering and pagination
   */
  async listArticles(
    orgId: string | undefined,
    filters: HelpArticleFilters
  ): Promise<{
    items: HelpArticleDoc[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }> {
    const tenantScope = buildTenantScope(orgId);
    const query: FilterQuery<HelpArticleDoc> = { ...tenantScope };
    
    if (filters.status && filters.status !== "ALL") {
      query.status = filters.status;
    }
    if (filters.category) {
      query.category = filters.category;
    }
    if (filters.locale) {
      query.locale = filters.locale;
    }
    
    const page = filters.page ?? 1;
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 50);
    const skip = (page - 1) * limit;
    
    let items: HelpArticleDoc[];
    let total: number;
    
    if (filters.q) {
      // Text search
      try {
        const textQuery = { ...query, $text: { $search: filters.q } };
        total = await HelpArticle.countDocuments(textQuery);
        items = await HelpArticle.find(textQuery)
          .select("slug title category updatedAt")
          .sort({ score: { $meta: "textScore" } })
          .skip(skip)
          .limit(limit)
          .maxTimeMS(250)
          .lean();
      } catch (_err) {
        // Fallback to regex if text index missing
        const safeQ = filters.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(safeQ, "i");
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - 6);
        
        const regexQuery = {
          ...query,
          updatedAt: { $gte: cutoffDate },
          $or: [{ title: regex }, { content: regex }, { tags: regex }],
        };
        
        total = await HelpArticle.countDocuments(regexQuery);
        items = await HelpArticle.find(regexQuery)
          .select("slug title category updatedAt")
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .maxTimeMS(250)
          .lean();
      }
    } else {
      total = await HelpArticle.countDocuments(query);
      items = await HelpArticle.find(query)
        .select("slug title category updatedAt")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .maxTimeMS(250)
        .lean();
    }
    
    return {
      items,
      total,
      page,
      limit,
      hasMore: skip + items.length < total,
    };
  },

  /**
   * Update article by ID or slug
   */
  async updateArticle(
    idOrSlug: string,
    orgId: string | undefined,
    userId: string,
    updates: Partial<Pick<HelpArticleDoc, "title" | "content" | "category" | "tags" | "status">>
  ): Promise<HelpArticleDoc | null> {
    const tenantScope = buildTenantScope(orgId);
    
    let filter: FilterQuery<HelpArticleDoc>;
    if (Types.ObjectId.isValid(idOrSlug)) {
      filter = { _id: new Types.ObjectId(idOrSlug), ...tenantScope };
    } else {
      filter = { slug: idOrSlug, ...tenantScope };
    }
    
    const result = await HelpArticle.findOneAndUpdate(
      filter,
      {
        $set: {
          ...updates,
          updatedBy: userId,
          updatedAt: new Date(),
        },
      },
      { new: true }
    ).lean();
    
    return result;
  },

  /**
   * Delete article by ID or slug
   */
  async deleteArticle(
    idOrSlug: string,
    orgId: string | undefined
  ): Promise<boolean> {
    const tenantScope = buildTenantScope(orgId);
    
    let filter: FilterQuery<HelpArticleDoc>;
    if (Types.ObjectId.isValid(idOrSlug)) {
      filter = { _id: new Types.ObjectId(idOrSlug), ...tenantScope };
    } else {
      filter = { slug: idOrSlug, ...tenantScope };
    }
    
    const result = await HelpArticle.deleteOne(filter);
    return result.deletedCount > 0;
  },
};

export default helpArticleService;

/**
 * @description Retrieves the category tree for marketplace navigation.
 * Returns hierarchical categories with parent-child relationships.
 * Categories are organization-scoped for multi-tenant marketplace support.
 * @route GET /api/marketplace/categories
 * @access Public - Categories are publicly visible for marketplace browsing
 * @returns {Object} categories: flat list, tree: nested hierarchy structure
 * @throws {500} If server error occurs during retrieval
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import Category from "@/server/models/marketplace/Category";
import { resolveMarketplaceContext } from "@/lib/marketplace/context";
import { serializeCategory } from "@/lib/marketplace/serializers";

import { createSecureResponse } from "@/server/security/headers";

export const dynamic = "force-dynamic";
/**
 * @openapi
 * /api/marketplace/categories:
 *   get:
 *     summary: marketplace/categories operations
 *     tags: [marketplace]
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
export async function GET(request: NextRequest) {
  try {
    const context = await resolveMarketplaceContext(request);
    await connectToDatabase();
    const categories = await Category.find({ orgId: context.orgId })
      .sort({ createdAt: 1 })
      .lean();

    interface CategorySerialized {
      _id: string;
      parentId?: string;
      [key: string]: unknown;
    }

    const serialized = categories.map((category) =>
      serializeCategory(category),
    ) as CategorySerialized[];

    const parentMap = new Map<string, CategorySerialized[]>();
    serialized.forEach((category) => {
      const parentId = category.parentId ?? "root";
      if (!parentMap.has(parentId)) {
        parentMap.set(parentId, []);
      }
      parentMap.get(parentId)!.push(category);
    });

    interface CategoryNode {
      _id: string;
      [key: string]: unknown;
    }

    const buildTree = (parentId: string | undefined): CategoryNode[] => {
      const nodes = parentMap.get(parentId ?? "root") ?? [];
      return (nodes as CategoryNode[]).map((node) => ({
        ...node,
        children: buildTree(node._id),
      }));
    };

    const tree = buildTree(undefined);

    return NextResponse.json({
      ok: true,
      data: serialized,
      tree,
    });
  } catch (error) {
    logger.error(
      "Failed to fetch marketplace categories",
      error instanceof Error ? error.message : "Unknown error",
    );
    return createSecureResponse(
      { error: "Unable to fetch categories" },
      500,
      request,
    );
  }
}

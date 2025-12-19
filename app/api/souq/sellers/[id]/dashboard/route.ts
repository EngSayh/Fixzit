/**
 * @description Provides seller dashboard metrics and statistics.
 * Returns sales performance, order counts, review ratings, and listing stats.
 * Super admins can access any seller's dashboard via targetOrgId.
 * @route GET /api/souq/sellers/[id]/dashboard
 * @access Private - Seller owner or platform admin
 * @param {string} id - Seller ID
 * @query {string} targetOrgId - Organization ID for admin access (super admin only)
 * @returns {Object} sales: revenue stats, orders: count and status, reviews: ratings, listings: active count
 * @throws {400} If targetOrgId missing for platform admin
 * @throws {401} If user is not authenticated
 * @throws {403} If user does not own seller profile
 * @throws {404} If seller not found
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { SouqSeller } from "@/server/models/souq/Seller";
import { SouqListing } from "@/server/models/souq/Listing";
import { SouqOrder } from "@/server/models/souq/Order";
import { SouqReview } from "@/server/models/souq/Review";
import { connectDb } from "@/lib/mongodb-unified";
import {
  Role,
  SubRole,
  normalizeRole,
  normalizeSubRole,
  inferSubRoleFromRole,
} from "@/lib/rbac/client-roles";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

export async function GET(
  request: NextRequest,
  context: { params: { id: string } },
) {
  // Rate limiting: 60 requests per minute per IP for seller dashboard
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-sellers:dashboard",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // 🔒 AUTH: Require authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionOrgId = (session.user as { orgId?: string }).orgId;
    const rawSubRole = (session.user as { subRole?: string | null }).subRole;
    const normalizedSubRole =
      normalizeSubRole(rawSubRole) ??
      inferSubRoleFromRole((session.user as { role?: string }).role);
    const normalizedRole = normalizeRole(
      (session.user as { role?: string }).role,
      normalizedSubRole,
    );
    const isSuperAdmin =
      normalizedRole === Role.SUPER_ADMIN || session.user.isSuperAdmin;
    const targetOrgId = request.nextUrl.searchParams.get("targetOrgId") || undefined;
    const orgId = isSuperAdmin ? (targetOrgId || sessionOrgId) : sessionOrgId;
    if (isSuperAdmin && !orgId) {
      return NextResponse.json(
        { error: "targetOrgId is required for platform admins" },
        { status: 400 },
      );
    }
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }

    await connectDb();

    const sellerId = context.params.id;

    const sellerQuery: Record<string, unknown> = { _id: sellerId };
    if (orgId) {
      sellerQuery.orgId = orgId;
    }

    const seller = await SouqSeller.findOne(sellerQuery).lean();

    if (!seller) {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }

    // 🔒 ACCESS CONTROL: Only seller owner or same-org admin (or super admin) can view dashboard
    const isOwner = seller.userId?.toString() === session.user.id;
    const isOrgAdmin =
      normalizedRole !== null &&
      [Role.ADMIN, Role.CORPORATE_OWNER].includes(normalizedRole);
    const isOpsOrSupport =
      normalizedRole === Role.TEAM_MEMBER &&
      !!normalizedSubRole &&
      [SubRole.OPERATIONS_MANAGER, SubRole.SUPPORT_AGENT].includes(
        normalizedSubRole,
      );

    const isSameOrgAdmin =
      (isOrgAdmin || isOpsOrSupport) &&
      seller.orgId &&
      sessionOrgId &&
      seller.orgId.toString() === sessionOrgId;

    if (!isOwner && !isSuperAdmin && !isSameOrgAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalListings,
      activeListings,
      totalOrders,
      recentOrders,
      totalRevenue,
      recentRevenue,
      averageRating,
    ] = await Promise.all([
      SouqListing.countDocuments({ sellerId, orgId: seller.orgId }),
      SouqListing.countDocuments({ sellerId, orgId: seller.orgId, status: "active" }),
      SouqOrder.countDocuments({ "items.sellerId": sellerId, orgId: seller.orgId }),
      SouqOrder.countDocuments({
        "items.sellerId": sellerId,
        orgId: seller.orgId,
        createdAt: { $gte: thirtyDaysAgo },
      }),
      // AUDIT-2025-12-18: Added maxTimeMS to aggregates
      SouqOrder.aggregate([
        { $unwind: "$items" },
        { $match: { "items.sellerId": seller._id, orgId: seller.orgId } },
        { $group: { _id: null, total: { $sum: "$items.subtotal" } } },
      ], { maxTimeMS: 10_000 }),
      SouqOrder.aggregate([
        { $unwind: "$items" },
        {
          $match: {
            "items.sellerId": seller._id,
            orgId: seller.orgId,
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        { $group: { _id: null, total: { $sum: "$items.subtotal" } } },
      ], { maxTimeMS: 10_000 }),
      SouqReview.aggregate([
        {
          $lookup: {
            from: "souq_products",
            localField: "productId",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" },
        {
          $lookup: {
            from: "souq_listings",
            localField: "product._id",
            foreignField: "productId",
            as: "listings",
          },
        },
        { $unwind: "$listings" },
        { $match: { "listings.sellerId": seller._id } },
        { $group: { _id: null, avgRating: { $avg: "$rating" } } },
      ], { maxTimeMS: 10_000 }),
    ]);

    // Extract distinct productIds before the next two queries to avoid redundant calls
    const productIds = await SouqListing.distinct("productId", {
      sellerId,
      orgId: seller.orgId,
    });

    // NO_TENANT_SCOPE: productIds derived from org-scoped listings
    const [totalReviews, pendingReviews] = await Promise.all([
      SouqReview.countDocuments({
        productId: { $in: productIds },
      }),
      SouqReview.countDocuments({
        productId: { $in: productIds },
        sellerResponse: { $exists: false },
        createdAt: { $gte: thirtyDaysAgo },
      }),
    ]);

    const stats = {
      listings: {
        total: totalListings,
        active: activeListings,
        inactive: totalListings - activeListings,
      },
      orders: {
        total: totalOrders,
        recent: recentOrders,
        growth:
          totalOrders > 0
            ? ((recentOrders / totalOrders) * 100).toFixed(1)
            : "0.0",
      },
      revenue: {
        total: totalRevenue[0]?.total || 0,
        recent: recentRevenue[0]?.total || 0,
        currency: "SAR",
      },
      reviews: {
        averageRating: averageRating[0]?.avgRating
          ? parseFloat(averageRating[0].avgRating.toFixed(2))
          : 0,
        totalReviews,
        pendingResponses: pendingReviews,
      },
      accountHealth: {
        score: seller.accountHealth.score,
        status: seller.accountHealth.status,
        orderDefectRate: seller.accountHealth.orderDefectRate,
        lateShipmentRate: seller.accountHealth.lateShipmentRate,
        cancellationRate: seller.accountHealth.cancellationRate,
        validTrackingRate: seller.accountHealth.validTrackingRate,
        onTimeDeliveryRate: seller.accountHealth.onTimeDeliveryRate,
        lastCalculated: seller.accountHealth.lastCalculated,
      },
      tier: seller.tier,
      kycStatus: seller.kycStatus,
      isActive: seller.isActive,
      isSuspended: seller.isSuspended,
      violations: seller.violations.length,
      features: seller.features,
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error("Seller dashboard error:", error as Error);
    return NextResponse.json(
      { error: "Failed to fetch seller dashboard" },
      { status: 500 },
    );
  }
}

/**
 * Souq Seller Dashboard API - Seller metrics and statistics
 * @route /api/souq/sellers/[id]/dashboard
 */

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { SouqSeller } from '@/server/models/souq/Seller';
import { SouqListing } from '@/server/models/souq/Listing';
import { SouqOrder } from '@/server/models/souq/Order';
import { SouqReview } from '@/server/models/souq/Review';
import { connectDb } from '@/lib/mongodb-unified';

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  try {
    await connectDb();

    const sellerId = context.params.id;

    const seller = await SouqSeller.findById(sellerId);

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
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
      SouqListing.countDocuments({ sellerId }),
      SouqListing.countDocuments({ sellerId, status: 'active' }),
      SouqOrder.countDocuments({ 'items.sellerId': sellerId }),
      SouqOrder.countDocuments({
        'items.sellerId': sellerId,
        createdAt: { $gte: thirtyDaysAgo },
      }),
      SouqOrder.aggregate([
        { $unwind: '$items' },
        { $match: { 'items.sellerId': seller._id } },
        { $group: { _id: null, total: { $sum: '$items.subtotal' } } },
      ]),
      SouqOrder.aggregate([
        { $unwind: '$items' },
        {
          $match: {
            'items.sellerId': seller._id,
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        { $group: { _id: null, total: { $sum: '$items.subtotal' } } },
      ]),
      SouqReview.aggregate([
        {
          $lookup: {
            from: 'souq_products',
            localField: 'productId',
            foreignField: '_id',
            as: 'product',
          },
        },
        { $unwind: '$product' },
        {
          $lookup: {
            from: 'souq_listings',
            localField: 'product._id',
            foreignField: 'productId',
            as: 'listings',
          },
        },
        { $unwind: '$listings' },
        { $match: { 'listings.sellerId': seller._id } },
        { $group: { _id: null, avgRating: { $avg: '$rating' } } },
      ]),
    ]);

    // Extract distinct productIds before the next two queries to avoid redundant calls
    const productIds = await SouqListing.distinct('productId', { sellerId });

    const [totalReviews, pendingReviews] = await Promise.all([
      SouqReview.countDocuments({
        productId: { $in: productIds },
      }),
      SouqReview.countDocuments({
        productId: { $in: productIds },
        'sellerResponse': { $exists: false },
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
            : '0.0',
      },
      revenue: {
        total: totalRevenue[0]?.total || 0,
        recent: recentRevenue[0]?.total || 0,
        currency: 'SAR',
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
    logger.error('Seller dashboard error:', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch seller dashboard' },
      { status: 500 }
    );
  }
}

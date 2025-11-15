/**
 * Souq Reviews API - Product reviews management
 * @route /api/souq/reviews
 */

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { SouqReview } from '@/server/models/souq/Review';
import { SouqOrder } from '@/server/models/souq/Order';
import { connectDb } from '@/lib/mongodb-unified';
import { nanoid } from 'nanoid';
import { getServerSession } from '@/lib/auth/getServerSession';

const reviewCreateSchema = z.object({
  productId: z.string(),
  fsin: z.string(),
  customerId: z.string(),
  customerName: z.string().min(2),
  orderId: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(5).max(200),
  content: z.string().min(20).max(5000),
  pros: z.array(z.string()).optional(),
  cons: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    if (!session.user.orgId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Organization context required' },
        { status: 403 }
      );
    }
    
    await connectDb();

    const body = await request.json();
    const validatedData = reviewCreateSchema.parse(body);

    let isVerifiedPurchase = false;

    if (validatedData.orderId) {
      const order = await SouqOrder.findOne({
        _id: validatedData.orderId,
        customerId: validatedData.customerId,
        'items.fsin': validatedData.fsin,
        status: { $in: ['delivered', 'completed'] },
      });

      if (order) {
        isVerifiedPurchase = true;
      }
    }

    const existingReview = await SouqReview.findOne({
      customerId: validatedData.customerId,
      productId: validatedData.productId,
    });

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this product' },
        { status: 400 }
      );
    }

    const reviewId = `REV-${nanoid(10).toUpperCase()}`;

    const orgId = (session.user as { orgId?: string }).orgId;

    const review = await SouqReview.create({
      ...validatedData,
      reviewId,
      org_id: orgId,
      isVerifiedPurchase,
      status: 'pending',
      helpful: 0,
      notHelpful: 0,
      reportedCount: 0,
    });

    return NextResponse.json({
      success: true,
      data: review,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', issues: error.issues },
        { status: 400 }
      );
    }

    logger.error('Review creation error:', error as Error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDb();

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const fsin = searchParams.get('fsin');
    const rating = searchParams.get('rating');
    const verified = searchParams.get('verified');
    const status = searchParams.get('status') || 'published';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const query: Record<string, unknown> = {};

    if (productId) {
      query.productId = productId;
    }

    if (fsin) {
      query.fsin = fsin;
    }

    if (rating) {
      query.rating = parseInt(rating);
    }

    if (verified === 'true') {
      query.isVerifiedPurchase = true;
    }

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [reviews, total, ratingDistribution, averageRatingResult] = await Promise.all([
      SouqReview.find(query)
        .sort({ helpful: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SouqReview.countDocuments(query),
      SouqReview.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
      ]),
      SouqReview.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
          },
        },
      ]),
    ]);

    const averageRating = averageRatingResult.length > 0 && averageRatingResult[0].avgRating 
      ? averageRatingResult[0].avgRating
      : 0;

    return NextResponse.json({
      success: true,
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: {
        averageRating: parseFloat(averageRating.toFixed(2)),
        totalReviews: total,
        ratingDistribution,
      },
    });
  } catch (error) {
    logger.error('Review fetch error:', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

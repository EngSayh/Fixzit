import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { auth } from '@/auth';
import { connectDb } from '@/lib/mongodb-unified';
import { SouqSettlement } from '@/server/models/souq/Settlement';
import mongoose from 'mongoose';

/**
 * GET /api/souq/settlements - List seller settlements
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDb();
    
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get('sellerId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!sellerId) {
      return NextResponse.json(
        { error: 'Seller ID is required' },
        { status: 400 }
      );
    }

    const query: Record<string, unknown> = { sellerId };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [settlements, total] = await Promise.all([
      SouqSettlement.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SouqSettlement.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: settlements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('GET /api/souq/settlements error:', error as Error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settlements' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/souq/settlements - Process settlement (Admin only)
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDb();
    
    const body = await request.json();
    const { settlementId, action } = body;

    if (!settlementId || !action) {
      return NextResponse.json(
        { error: 'Settlement ID and action are required' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject', 'paid'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: approve, reject, or paid' },
        { status: 400 }
      );
    }

    const settlement = await SouqSettlement.findOne({ settlementId });

    if (!settlement) {
      return NextResponse.json(
        { error: 'Settlement not found' },
        { status: 404 }
      );
    }

    // Update settlement based on action
    if (action === 'approve') {
      settlement.status = 'approved';
    } else if (action === 'reject') {
      settlement.status = 'rejected';
    } else if (action === 'paid') {
      settlement.status = 'paid';
      settlement.paidDate = new Date();
    }

    settlement.processedBy = (session.user as { id?: string }).id as unknown as mongoose.Types.ObjectId;
    settlement.processedAt = new Date();
    
    await settlement.save();

    return NextResponse.json({
      success: true,
      data: settlement,
    });
  } catch (error) {
    logger.error('POST /api/souq/settlements error:', error as Error);
    return NextResponse.json(
      { success: false, error: 'Failed to process settlement' },
      { status: 500 }
    );
  }
}

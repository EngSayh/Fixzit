/**
 * Admin Notification History API
 * GET /api/admin/notifications/history
 * 
 * Fetch notification history for audit and tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDatabase } from '@/lib/mongodb-unified';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Super admin check
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const limitParam = Number.parseInt(searchParams.get('limit') || '', 10);
    const skipParam = Number.parseInt(searchParams.get('skip') || '', 10);

    const limit = Math.min(Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 50, 100);
    const skip = Number.isFinite(skipParam) && skipParam >= 0 ? skipParam : 0;

    // Get database connection
    const db = await getDatabase();

    // Fetch notification history
    const notifications = await db
      .collection('admin_notifications')
      .find({})
      .sort({ sentAt: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();

    const total = await db.collection('admin_notifications').countDocuments({});

    logger.info('[Admin Notification] History fetched', {
      user: session.user.email,
      count: notifications.length,
      total
    });

    return NextResponse.json({
      success: true,
      data: notifications,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + notifications.length < total
      }
    });

  } catch (error) {
    logger.error('[Admin Notification] History fetch failed', { error });
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch history' 
      },
      { status: 500 }
    );
  }
}

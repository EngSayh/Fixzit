import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectToDatabase, getDatabase } from '@/lib/mongodb-unified';
import { logger } from '@/lib/logger';
import { ObjectId } from 'mongodb';

/**
 * GET /api/admin/communications
 * 
 * Fetch communication history with filtering and pagination
 * 
 * Query Parameters:
 * - userId: Filter by user ID
 * - channel: Filter by channel (sms, email, whatsapp, otp, all)
 * - status: Filter by status (sent, delivered, failed, pending)
 * - startDate: Filter from date (ISO string)
 * - endDate: Filter to date (ISO string)
 * - limit: Number of records per page (default: 50)
 * - skip: Number of records to skip (default: 0)
 * - search: Search in recipient, subject, or message
 * 
 * Response:
 * - 200: Communication logs with metadata
 * - 401: Unauthorized
 * - 403: Forbidden (not super admin)
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Check authentication and authorization
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is super admin
    const isSuperAdmin = (session.user as any).role === 'SUPER_ADMIN';
    if (!isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Super admin access required' },
        { status: 403 }
      );
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const channel = searchParams.get('channel') || 'all';
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const skip = parseInt(searchParams.get('skip') || '0', 10);

    // 3. Connect to database
    await connectToDatabase();
    const db = await getDatabase();

    // 4. Build aggregation pipeline
    const pipeline: any[] = [];

    // Match stage - filter by criteria
    const matchStage: any = {};

    if (userId) {
      if (!ObjectId.isValid(userId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid userId parameter' },
          { status: 400 }
        );
      }
      matchStage.userId = new ObjectId(userId);
    }

    if (channel && channel !== 'all') {
      matchStage.channel = channel;
    }

    if (status) {
      matchStage.status = status;
    }

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) {
        matchStage.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        matchStage.createdAt.$lte = new Date(endDate);
      }
    }

    if (search) {
      matchStage.$or = [
        { recipient: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
        { 'metadata.email': { $regex: search, $options: 'i' } },
        { 'metadata.phone': { $regex: search, $options: 'i' } },
      ];
    }

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // Lookup user details
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    });

    pipeline.push({
      $unwind: {
        path: '$user',
        preserveNullAndEmptyArrays: true,
      },
    });

    // Add user details to result
    pipeline.push({
      $addFields: {
        userName: {
          $concat: [
            { $ifNull: ['$user.personal.firstName', ''] },
            ' ',
            { $ifNull: ['$user.personal.lastName', ''] },
          ],
        },
        userEmail: '$user.email',
        userPhone: {
          $ifNull: ['$user.contact.phone', '$user.personal.phone'],
        },
      },
    });

    // Sort by creation date (newest first)
    pipeline.push({ $sort: { createdAt: -1 } });

    // Count total matching documents
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await db
      .collection('communication_logs')
      .aggregate(countPipeline)
      .toArray();
    const total = countResult[0]?.total || 0;

    // Pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    // Project final fields
    pipeline.push({
      $project: {
        _id: 1,
        userId: 1,
        userName: 1,
        userEmail: 1,
        userPhone: 1,
        channel: 1,
        type: 1,
        recipient: 1,
        subject: 1,
        message: 1,
        status: 1,
        metadata: 1,
        createdAt: 1,
        updatedAt: 1,
        deliveredAt: 1,
        failedAt: 1,
        errorMessage: 1,
      },
    });

    // Execute aggregation
    const communications = await db
      .collection('communication_logs')
      .aggregate(pipeline)
      .toArray();

    // 5. Get statistics
    const statsResult = await db
      .collection('communication_logs')
      .aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalSent: { $sum: 1 },
            totalDelivered: {
              $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] },
            },
            totalFailed: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
            },
            totalPending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
            },
            smsCount: {
              $sum: { $cond: [{ $eq: ['$channel', 'sms'] }, 1, 0] },
            },
            emailCount: {
              $sum: { $cond: [{ $eq: ['$channel', 'email'] }, 1, 0] },
            },
            whatsappCount: {
              $sum: { $cond: [{ $eq: ['$channel', 'whatsapp'] }, 1, 0] },
            },
            otpCount: {
              $sum: { $cond: [{ $eq: ['$channel', 'otp'] }, 1, 0] },
            },
          },
        },
      ])
      .toArray();

    const stats = statsResult[0] || {
      totalSent: 0,
      totalDelivered: 0,
      totalFailed: 0,
      totalPending: 0,
      smsCount: 0,
      emailCount: 0,
      whatsappCount: 0,
      otpCount: 0,
    };

    // 6. Return response
    return NextResponse.json({
      success: true,
      data: {
        communications,
        pagination: {
          total,
          limit,
          skip,
          pages: Math.ceil(total / limit),
          currentPage: Math.floor(skip / limit) + 1,
        },
        statistics: {
          ...stats,
          deliveryRate: stats.totalSent > 0 
            ? ((stats.totalDelivered / stats.totalSent) * 100).toFixed(2) + '%'
            : '0%',
          failureRate: stats.totalSent > 0
            ? ((stats.totalFailed / stats.totalSent) * 100).toFixed(2) + '%'
            : '0%',
        },
      },
    });
  } catch (error) {
    logger.error('[Admin] Get communications error', error as Error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

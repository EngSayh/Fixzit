/**
 * Aqar Souq - Favorites API
 * 
 * GET /api/aqar/favorites - Get user's favorites
 * POST /api/aqar/favorites - Add to favorites
 * DELETE /api/aqar/favorites/[id] - Remove from favorites
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/lib/mongo';
import { AqarFavorite } from '@/models/aqar';
import { getSessionUser } from '@/server/middleware/withAuthRbac';


export const runtime = 'nodejs';

// GET /api/aqar/favorites
export async function GET(request: NextRequest) {
  try {
    await connectDb();
    
    const user = await getSessionUser(request);
    
    const { searchParams } = new URL(request.url);
    const targetType = searchParams.get('targetType'); // LISTING|PROJECT
    
    const query: Record<string, unknown> = {
      userId: user.id,
    };
    
    if (targetType) {
      query.targetType = targetType;
    }
    
    const favorites = await AqarFavorite.find(query)
      .sort({ createdAt: -1 })
      .lean();
    
    // Fix N+1 query problem: bulk load all targets
    const { AqarListing, AqarProject } = await import('@/models/aqar');
    
    // Group targetIds by type
    const listingIds: string[] = [];
    const projectIds: string[] = [];
    
    for (const fav of favorites) {
      if (fav.targetType === 'LISTING') {
        listingIds.push(fav.targetId.toString());
      } else if (fav.targetType === 'PROJECT') {
        projectIds.push(fav.targetId.toString());
      }
    }
    
    // Bulk query for all listings and projects (2 queries instead of N)
    const [listings, projects] = await Promise.all([
      listingIds.length > 0 
        ? AqarListing.find({ _id: { $in: listingIds } }).lean()
        : Promise.resolve([]),
      projectIds.length > 0
        ? AqarProject.find({ _id: { $in: projectIds } }).lean()
        : Promise.resolve([])
    ]);
    
    // Build lookup maps keyed by id
    const listingMap = new Map(listings.map(l => [l._id.toString(), l]));
    const projectMap = new Map(projects.map(p => [p._id.toString(), p]));
    
    // Attach targets in single pass
    for (const fav of favorites) {
      const targetIdStr = fav.targetId.toString();
      if (fav.targetType === 'LISTING') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fav as any).target = listingMap.get(targetIdStr);
      } else if (fav.targetType === 'PROJECT') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fav as any).target = projectMap.get(targetIdStr);
      }
    }
    
    return NextResponse.json({ favorites });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 });
  }
}

// POST /api/aqar/favorites
export async function POST(request: NextRequest) {
  try {
    await connectDb();
    
    const user = await getSessionUser(request);
    
    const body = await request.json();
    const { targetId, targetType, notes, tags } = body;
    
    if (!targetId || !targetType) {
      return NextResponse.json(
        { error: 'targetId and targetType are required' },
        { status: 400 }
      );
    }
    
    // Validate targetType against allowed values
    const ALLOWED_TARGET_TYPES = ['LISTING', 'PROJECT'];
    if (!ALLOWED_TARGET_TYPES.includes(targetType)) {
      return NextResponse.json(
        { error: `Invalid targetType. Must be one of: ${ALLOWED_TARGET_TYPES.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Create favorite - rely on unique compound index to prevent duplicates
    // The model should have: index({ userId: 1, targetId: 1, targetType: 1 }, { unique: true })
    const favorite = new AqarFavorite({
      userId: user.id,
      orgId: user.orgId || user.id,
      targetId,
      targetType,
      notes,
      tags,
    });
    
    try {
      await favorite.save();
    } catch (saveError: unknown) {
      // Check for duplicate key error (MongoDB error code 11000)
      const isMongoError = saveError && typeof saveError === 'object' && 'code' in saveError;
      if (isMongoError && ((saveError as { code?: number }).code === 11000 || (saveError as { name?: string }).name === 'MongoServerError')) {
        return NextResponse.json(
          { error: 'Already in favorites' },
          { status: 409 }
        );
      }
      // Re-throw other errors
      throw saveError;
    }
    
    // Increment favorites count with proper error handling
    if (targetType === 'LISTING') {
      try {
        const { AqarListing } = await import('@/models/aqar');
        await AqarListing.findByIdAndUpdate(
          targetId,
          { $inc: { 'analytics.favorites': 1 } }
        ).exec();
      } catch (analyticsError) {
        // Log but don't fail the request
        console.error(
          'Failed to increment favorites count:',
          {
            targetId,
            targetType,
            error: analyticsError instanceof Error ? analyticsError.message : 'Unknown error'
          }
        );
      }
    }
    
    return NextResponse.json({ favorite }, { status: 201 });
  } catch (error) {
    console.error('Error adding favorite:', error);
    return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 });
  }
}

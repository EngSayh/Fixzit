/**
 * Aqar Souq - Favorites API
 * 
 * GET /api/aqar/favorites - Get user's favorites
 * POST /api/aqar/favorites - Add to favorites
 * DELETE /api/aqar/favorites/[id] - Remove from favorites
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/mongo';
import { AqarFavorite, AqarListing, AqarProject } from '@/models/aqar';
import { getSessionUser } from '@/server/middleware/withAuthRbac';

export const runtime = 'nodejs';

// GET /api/aqar/favorites
export async function GET(request: NextRequest) {
  try {
    await connectDb();
    
    // Handle authentication separately to return 401 instead of 500
    let user;
    try {
      user = await getSessionUser(request);
    } catch (authError) {
      // Log only sanitized error message to avoid exposing sensitive data
      logger.error('Authentication failed:', authError instanceof Error ? authError.message : 'Unknown error');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Consistent tenant isolation - use orgId if available, fallback to userId
    const tenantOrgId = user.orgId || user.id;
    
    const { searchParams } = new URL(request.url);
    const targetType = searchParams.get('targetType'); // LISTING|PROJECT
    
    // Pagination with validation - handle NaN explicitly
    const parsedPage = parseInt(searchParams.get('page') || '1', 10);
    const parsedLimit = parseInt(searchParams.get('limit') || '20', 10);
    const page = Number.isNaN(parsedPage) ? 1 : Math.max(1, parsedPage);
    const limit = Number.isNaN(parsedLimit) ? 20 : Math.min(100, Math.max(1, parsedLimit));
    const skip = (page - 1) * limit;
    
    const query: Record<string, unknown> = {
      userId: user.id,
      orgId: tenantOrgId,
    };
    
    if (targetType) {
      query.targetType = targetType;
    }
    
    // Fetch favorites with pagination and total count in parallel
    const [favorites, total] = await Promise.all([
      AqarFavorite.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AqarFavorite.countDocuments(query)
    ]);
    
    // Batch-fetch targets to eliminate N+1 queries
    // Step 1: Collect all targetIds by targetType
    const listingIds: mongoose.Types.ObjectId[] = [];
    const projectIds: mongoose.Types.ObjectId[] = [];

    for (const fav of favorites) {
      try {
        const tid = fav.targetId && mongoose.Types.ObjectId.isValid(fav.targetId) ? new mongoose.Types.ObjectId(fav.targetId) : null;
        if (!tid) continue;
        if (fav.targetType === 'LISTING') {
          listingIds.push(tid);
        } else if (fav.targetType === 'PROJECT') {
          projectIds.push(tid);
        }
      } catch {
        // skip invalid ids
        continue;
      }
    }
    
    // Step 2: Batch-fetch all listings and projects in parallel (with tenant isolation)
    const [listings, projects] = await Promise.all([
      listingIds.length > 0 
        ? AqarListing.find({ _id: { $in: listingIds }, orgId: tenantOrgId }).lean()
        : [],
      projectIds.length > 0
        ? AqarProject.find({ _id: { $in: projectIds }, orgId: tenantOrgId }).lean()
        : []
    ]);
    
    // Step 3: Create lookup maps for O(1) access
    const listingMap = new Map(listings.map((l: { _id: { toString: () => string } }) => [l._id.toString(), l]));
    const projectMap = new Map(projects.map((p: { _id: { toString: () => string } }) => [p._id.toString(), p]));
    
    // Step 4: Attach targets to favorites
    const favoritesWithTargets = favorites.map((fav: any) => {
      const targetIdStr = fav.targetId.toString();
      
      if (fav.targetType === 'LISTING') {
        return { ...fav, target: listingMap.get(targetIdStr) || null };
      } else if (fav.targetType === 'PROJECT') {
        return { ...fav, target: projectMap.get(targetIdStr) || null };
      }
      
      return fav;
    });
    
    return NextResponse.json({
      favorites: favoritesWithTargets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching favorites:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 });
  }
}

// POST /api/aqar/favorites
export async function POST(request: NextRequest) {
  try {
    await connectDb();
    
    // Handle authentication separately to return 401 instead of 500
    let user;
    try {
      user = await getSessionUser(request);
    } catch (authError) {
      // Log only sanitized error message to avoid exposing sensitive data
      logger.error('Authentication failed:', authError instanceof Error ? authError.message : 'Unknown error');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Consistent tenant isolation - use orgId if available, fallback to userId
    const tenantOrgId = user.orgId || user.id;
    
  const body = await request.json();
  const { targetId, targetType } = body;
  let { notes, tags } = body;
    
    if (!targetId || !targetType) {
      return NextResponse.json(
        { error: 'targetId and targetType are required' },
        { status: 400 }
      );
    }
    // Validate targetId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return NextResponse.json({ error: 'Invalid targetId' }, { status: 400 });
    }
    
    // Validate targetType against allowed values
    const ALLOWED_TARGET_TYPES = ['LISTING', 'PROJECT'];
    if (!ALLOWED_TARGET_TYPES.includes(targetType)) {
      return NextResponse.json(
        { error: `Invalid targetType. Must be one of: ${ALLOWED_TARGET_TYPES.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Check if already favorited (with tenant isolation)
    const existing = await AqarFavorite.findOne({
      userId: user.id,
      orgId: tenantOrgId,
      targetId: new mongoose.Types.ObjectId(targetId),
      targetType,
    });
    
    if (existing) {
      return NextResponse.json(
        { error: 'Already in favorites' },
        { status: 409 }
      );
    }
    
    // Verify referenced target exists within same tenant (prevent cross-tenant favorites)
    const targetObjectId = new mongoose.Types.ObjectId(targetId);
    if (targetType === 'LISTING') {
      const listingExists = await AqarListing.findOne({ _id: targetObjectId, orgId: tenantOrgId }).lean();
      if (!listingExists) {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
      }
    } else if (targetType === 'PROJECT') {
      const projectExists = await AqarProject.findOne({ _id: targetObjectId, orgId: tenantOrgId }).lean();
      if (!projectExists) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
    }

    // sanitize inputs
    notes = typeof notes === 'string' ? notes.trim().slice(0, 2000) : undefined;
    if (!Array.isArray(tags)) tags = [];
  tags = tags.map((t: unknown) => String(t).slice(0, 100)).slice(0, 20);

    const favorite = new AqarFavorite({
      userId: user.id,
      orgId: tenantOrgId,
      targetId: targetObjectId,
      targetType,
      notes,
      tags,
    });
    
    // Handle duplicate key race condition gracefully
    try {
      await favorite.save();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && err.code === 11000) {
        return NextResponse.json({ error: 'Already in favorites' }, { status: 409 });
      }
      throw err;
    }
    
    // Increment favorites count on listing/project in detached async blocks that await the update
    // but do not block the response. Errors are caught and logged to avoid silent failures.
    if (targetType === 'LISTING') {
      (async () => {
        try {
          await AqarListing.findByIdAndUpdate(targetId, { 
            $inc: { 'analytics.favorites': 1 },
            $set: { 'analytics.lastFavoritedAt': new Date() }
          }).exec();
        } catch (analyticsError) {
          logger.error('Failed to increment listing favorites analytics', {
            userId: user.id,
            targetId,
            targetType,
            message: analyticsError instanceof Error ? analyticsError.message : 'Unknown error'
          });
        }
      })();
    } else if (targetType === 'PROJECT') {
      (async () => {
        try {
          await AqarProject.findByIdAndUpdate(targetId, { 
            $inc: { 'analytics.favorites': 1 },
            $set: { 'analytics.lastFavoritedAt': new Date() }
          }).exec();
        } catch (analyticsError) {
          logger.error('Failed to increment project favorites analytics', {
            userId: user.id,
            targetId,
            targetType,
            message: analyticsError instanceof Error ? analyticsError.message : 'Unknown error'
          });
        }
      })();
    }
    
    return NextResponse.json({ favorite }, { status: 201 });
  } catch (error) {
    logger.error('Error adding favorite:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 });
  }
}

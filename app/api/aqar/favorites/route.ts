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
import mongoose from 'mongoose';

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
      .populate('targetId')
      .lean();
    
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
    
    // Validate ObjectId format
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
    
    // Check if already favorited
    const existing = await AqarFavorite.findOne({
      userId: user.id,
      targetId,
      targetType,
    });
    
    if (existing) {
      return NextResponse.json(
        { error: 'Already in favorites' },
        { status: 409 }
      );
    }
    
    // Verify target resource exists before creating favorite
    let targetExists = false;
    if (targetType === 'LISTING') {
      const { AqarListing } = await import('@/models/aqar');
      targetExists = !!(await AqarListing.exists({ _id: targetId }));
    } else if (targetType === 'PROJECT') {
      const { AqarProject } = await import('@/models/aqar');
      targetExists = !!(await AqarProject.exists({ _id: targetId }));
    }
    
    if (!targetExists) {
      return NextResponse.json(
        { error: 'Target resource not found' },
        { status: 404 }
      );
    }
    
    // Ensure orgId is a valid ObjectId - convert string if necessary
    const orgIdValue = user.orgId || user.id;
    const orgId = mongoose.Types.ObjectId.isValid(orgIdValue)
      ? new mongoose.Types.ObjectId(orgIdValue)
      : undefined;
    
    if (!orgId) {
      return NextResponse.json(
        { error: 'Invalid organization ID' },
        { status: 400 }
      );
    }
    
    const favorite = new AqarFavorite({
      userId: user.id,
      orgId,
      targetId,
      targetType,
      notes,
      tags,
    });
    
    try {
      await favorite.save();
    } catch (saveError) {
      // Check for duplicate key error (MongoDB error code 11000)
      const isMongoDupKey =
        saveError &&
        typeof saveError === 'object' &&
        'code' in saveError &&
        (saveError as { code?: number }).code === 11000;
      
      if (isMongoDupKey) {
        return NextResponse.json(
          { error: 'Already in favorites' },
          { status: 409 }
        );
      }
      throw saveError; // Re-throw other errors
    }
    
    // Increment favorites count on listing/project (async with error logging)
    if (targetType === 'LISTING') {
      const { AqarListing } = await import('@/models/aqar');
      AqarListing.findByIdAndUpdate(targetId, { 
        $inc: { 'analytics.favorites': 1 } 
      }).exec().catch((err: Error) => {
        console.error('Failed to update listing favorites count:', err);
      });
    } else if (targetType === 'PROJECT') {
      const { AqarProject } = await import('@/models/aqar');
      AqarProject.findByIdAndUpdate(targetId, { 
        $inc: { 'analytics.favorites': 1 } 
      }).exec().catch((err: Error) => {
        console.error('Failed to update project favorites count:', err);
      });
    }
    
    return NextResponse.json({ favorite }, { status: 201 });
  } catch (error) {
    console.error('Error adding favorite:', error);
    return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 });
  }
}

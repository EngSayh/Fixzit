/**
 * Aqar Souq - Delete Favorite API
 * 
 * DELETE /api/aqar/favorites/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { connectDb } from '@/lib/mongo';
import { AqarFavorite, AqarListing, AqarProject } from '@/models/aqar';
import { getSessionUser } from '@/server/middleware/withAuthRbac';

import mongoose from 'mongoose';

export const runtime = 'nodejs';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDb();
    
    const { id } = await params;
    
    // Handle authentication separately to return 401 instead of 500
    let user;
    try {
      user = await getSessionUser(request);
    } catch (authError) {
      // Log only sanitized error message to avoid exposing sensitive data
      logger.error('Authentication failed:', authError instanceof Error ? authError.message : 'Unknown error');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid favorite ID' }, { status: 400 });
    }
    
    const favorite = await AqarFavorite.findById(id);
    
    if (!favorite) {
      return NextResponse.json({ error: 'Favorite not found' }, { status: 404 });
    }
    
    // Check ownership
    if (favorite.userId.toString() !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Delete favorite first
    await favorite.deleteOne();
    
    // Decrement analytics after successful deletion (with error handling)
    if (favorite.targetType === 'LISTING') {
      try {
        await AqarListing.findByIdAndUpdate(
          favorite.targetId, 
          [
            { 
              $set: { 
                'analytics.favorites': { $max: [{ $subtract: ['$analytics.favorites', 1] }, 0] },
                'analytics.lastUpdatedAt': new Date() 
              } 
            }
          ]
        );
      } catch (analyticsError) {
        // Log analytics error but don't fail the request (deletion already succeeded)
        logger.error('Failed to decrement listing favorites analytics', {
          targetId: favorite.targetId.toString(),
          message: analyticsError instanceof Error ? analyticsError.message : 'Unknown error'
        });
      }
    } else if (favorite.targetType === 'PROJECT') {
      try {
        await AqarProject.findByIdAndUpdate(
          favorite.targetId, 
          [
            { 
              $set: { 
                'analytics.favorites': { $max: [{ $subtract: ['$analytics.favorites', 1] }, 0] },
                'analytics.lastUpdatedAt': new Date() 
              } 
            }
          ]
        );
      } catch (analyticsError) {
        // Log analytics error but don't fail the request (deletion already succeeded)
        logger.error('Failed to decrement project favorites analytics', {
          targetId: favorite.targetId.toString(),
          message: analyticsError instanceof Error ? analyticsError.message : 'Unknown error'
        });
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting favorite:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Failed to delete favorite' }, { status: 500 });
  }
}

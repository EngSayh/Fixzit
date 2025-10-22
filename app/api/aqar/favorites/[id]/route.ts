/**
 * Aqar Souq - Delete Favorite API
 * 
 * DELETE /api/aqar/favorites/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/lib/mongo';
import { AqarFavorite } from '@/models/aqar';
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
    
    const user = await getSessionUser(request);
    
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
    
    // Decrement favorites count with proper error handling
    if (favorite.targetType === 'LISTING') {
      try {
        const { AqarListing } = await import('@/models/aqar');
        // Atomically decrement only if count > 0 to prevent negative values
        await AqarListing.updateOne(
          { _id: favorite.targetId, 'analytics.favorites': { $gt: 0 } },
          {
            $inc: { 'analytics.favorites': -1 }
          }
        ).exec();
      } catch (analyticsError) {
        // Log analytics failure but don't fail the delete operation
        console.error(
          'Failed to decrement favorites count:',
          {
            targetId: favorite.targetId,
            action: 'decrement',
            error: analyticsError instanceof Error ? analyticsError.message : 'Unknown error'
          }
        );
      }
    }
    
    await favorite.deleteOne();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting favorite:', error);
    return NextResponse.json({ error: 'Failed to delete favorite' }, { status: 500 });
  }
}

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
    
    const user = await getSessionUser(request);
    
    const { id } = await params;
    
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
    
    // Decrement favorites count (async with error logging)
    if (favorite.targetType === 'LISTING') {
      const { AqarListing } = await import('@/models/aqar');
      AqarListing.findByIdAndUpdate(favorite.targetId, { 
        $inc: { 'analytics.favorites': -1 },
        $max: { 'analytics.favorites': 0 } // Prevent negative counts
      }).exec().catch((err: Error) => {
        console.error('Failed to update listing favorites count:', err);
      });
    }
    
    await favorite.deleteOne();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting favorite:', error);
    return NextResponse.json({ error: 'Failed to delete favorite' }, { status: 500 });
  }
}

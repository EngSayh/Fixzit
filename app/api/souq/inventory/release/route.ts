import { NextRequest, NextResponse } from 'next/server';
import { inventoryService } from '@/services/souq/inventory-service';
import { auth } from '@/auth';

/**
 * POST /api/souq/inventory/release
 * Release a reservation (order cancelled or expired)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { listingId, reservationId } = body;
    
    // Validation
    if (!listingId || !reservationId) {
      return NextResponse.json({ 
        error: 'Missing required fields: listingId, reservationId' 
      }, { status: 400 });
    }
    
    const released = await inventoryService.releaseReservation({
      listingId,
      reservationId
    });
    
    if (!released) {
      return NextResponse.json({ 
        success: false,
        message: 'Reservation not found or already released'
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Reservation released successfully'
    });
    
  } catch (error) {
    console.error('POST /api/souq/inventory/release error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

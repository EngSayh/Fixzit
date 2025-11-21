import { NextRequest, NextResponse } from 'next/server';
import { inventoryService } from '@/services/souq/inventory-service';
import { auth } from '@/auth';
import { logger } from '@/lib/logger';

/**
 * POST /api/souq/inventory/convert
 * Convert reservation to sale (order confirmed)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { listingId, reservationId, orderId } = body;
    
    // Validation
    if (!listingId || !reservationId || !orderId) {
      return NextResponse.json({ 
        error: 'Missing required fields: listingId, reservationId, orderId' 
      }, { status: 400 });
    }
    
    const converted = await inventoryService.convertReservationToSale({
      listingId,
      reservationId,
      orderId
    });
    
    if (!converted) {
      return NextResponse.json({ 
        success: false,
        message: 'Failed to convert reservation'
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Reservation converted to sale successfully',
      orderId
    });
    
  } catch (error) {
    logger.error('POST /api/souq/inventory/convert error', { error });
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

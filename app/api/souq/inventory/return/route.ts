import { NextRequest, NextResponse } from 'next/server';
import { inventoryService } from '@/services/souq/inventory-service';
import { auth } from '@/auth';

/**
 * POST /api/souq/inventory/return
 * Process return (RMA) and restock inventory
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { listingId, rmaId, quantity, condition } = body;
    
    // Validation
    if (!listingId || !rmaId || !quantity || !condition) {
      return NextResponse.json({ 
        error: 'Missing required fields: listingId, rmaId, quantity, condition' 
      }, { status: 400 });
    }
    
    if (!['sellable', 'unsellable'].includes(condition)) {
      return NextResponse.json({ 
        error: 'Invalid condition. Must be: sellable or unsellable' 
      }, { status: 400 });
    }
    
    const inventory = await inventoryService.processReturn({
      listingId,
      rmaId,
      quantity,
      condition
    });
    
    return NextResponse.json({ 
      success: true,
      message: `Return processed successfully. ${quantity} units restocked as ${condition}`,
      inventory: {
        inventoryId: inventory.inventoryId,
        availableQuantity: inventory.availableQuantity,
        totalQuantity: inventory.totalQuantity,
        health: inventory.health
      }
    });
    
  } catch (error) {
    logger.error('POST /api/souq/inventory/return error', { error });
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

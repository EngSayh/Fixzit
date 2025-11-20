import { NextRequest, NextResponse } from 'next/server';
import { inventoryService } from '@/services/souq/inventory-service';
import { auth } from '@/auth';

/**
 * GET /api/souq/inventory
 * Get seller's inventory list with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const sellerId = searchParams.get('sellerId') || session.user.id;
    const status = searchParams.get('status') || undefined;
    const fulfillmentType = searchParams.get('fulfillmentType') as 'FBM' | 'FBF' | undefined;
    const lowStockOnly = searchParams.get('lowStockOnly') === 'true';
    
    // Authorization: Can only view own inventory unless admin
    if (sellerId !== session.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const inventory = await inventoryService.getSellerInventory(sellerId, {
      status,
      fulfillmentType,
      lowStockOnly
    });
    
    return NextResponse.json({ 
      success: true, 
      inventory,
      count: inventory.length
    });
    
  } catch (error) {
    logger.error('GET /api/souq/inventory error', { error });
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/souq/inventory
 * Initialize or receive inventory
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { 
      action,
      listingId, 
      productId, 
      quantity, 
      fulfillmentType,
      warehouseId,
      binLocation,
      reason 
    } = body;
    
    // Validation
    if (!listingId || !quantity || quantity <= 0) {
      return NextResponse.json({ 
        error: 'Missing or invalid required fields: listingId, quantity' 
      }, { status: 400 });
    }
    
    if (action === 'initialize') {
      // Initialize new inventory
      if (!productId || !fulfillmentType) {
        return NextResponse.json({ 
          error: 'Missing required fields for initialization: productId, fulfillmentType' 
        }, { status: 400 });
      }
      
      const inventory = await inventoryService.initializeInventory({
        listingId,
        productId,
        sellerId: session.user.id,
        quantity,
        fulfillmentType,
        warehouseId,
        binLocation,
        performedBy: session.user.id,
        reason
      });
      
      return NextResponse.json({ 
        success: true, 
        inventory,
        message: 'Inventory initialized successfully'
      }, { status: 201 });
      
    } else {
      // Receive additional stock
      const inventory = await inventoryService.receiveStock(
        listingId, 
        quantity, 
        session.user.id, 
        reason
      );
      
      return NextResponse.json({ 
        success: true, 
        inventory,
        message: 'Stock received successfully'
      });
    }
    
  } catch (error) {
    logger.error('POST /api/souq/inventory error', { error });
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

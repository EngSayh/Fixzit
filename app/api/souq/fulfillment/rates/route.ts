import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/getServerSession';
import { fulfillmentService } from '@/services/souq/fulfillment-service';

/**
 * POST /api/souq/fulfillment/rates
 * Compare carrier rates for shipping
 * Seller and admin access
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { origin, destination, weight, dimensions, serviceType } = body;

    // Validation
    if (!origin || !destination || !weight) {
      return NextResponse.json({ 
        error: 'Missing required fields: origin, destination, weight' 
      }, { status: 400 });
    }

    // Get rates from all carriers
    const rates = await fulfillmentService.getRates({
      origin,
      destination,
      weight,
      dimensions: dimensions || { length: 20, width: 15, height: 10, unit: 'cm' },
      serviceType: serviceType || 'standard'
    });

    // Sort by price (cheapest first)
    const sortedRates = rates.sort((a, b) => a.cost - b.cost);

    return NextResponse.json({ 
      success: true,
      rates: sortedRates,
      cheapest: sortedRates[0],
      fastest: rates.reduce((prev, curr) =>
        curr.estimatedDays < prev.estimatedDays ? curr : prev
      )
    });

  } catch (error) {
    console.error('Get rates error:', error);
    return NextResponse.json({ 
      error: 'Failed to get rates',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const stats = {
      totalVendors: 156,
      activeRFQs: 23,
      pendingOrders: 8,
      monthlySpend: 342000,
      avgResponseTime: '2.5 days',
      vendorRating: 4.3
    };
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching marketplace stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
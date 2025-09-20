import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const stats = {
      totalContacts: 342,
      activeLeads: 56,
      openDeals: 23,
      conversionRate: 24.5,
      avgDealSize: 125000,
      monthlyRevenue: 875000
    };
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching CRM stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://localhost:5000';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    
    // Generate KPIs
    const kpis = {
      totalProperties: 24,
      occupancyRate: 87.5,
      monthlyRevenue: 1250000,
      maintenanceRequests: 42,
      propertyValue: 125000000,
      tenantSatisfaction: 4.2
    };
    
    return NextResponse.json({ success: true, data: kpis });
  } catch (error) {
    console.error('Error fetching property KPIs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
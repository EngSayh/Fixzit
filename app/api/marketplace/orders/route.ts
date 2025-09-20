import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const orders = [
      {
        id: '1',
        orderNumber: 'ORD-2025-001',
        vendor: 'TechSupply Co',
        items: 3,
        total: 15420,
        status: 'pending',
        date: new Date().toISOString()
      },
      {
        id: '2',
        orderNumber: 'ORD-2025-002',
        vendor: 'Maintenance Pro',
        items: 5,
        total: 8750,
        status: 'delivered',
        date: new Date(Date.now() - 86400000).toISOString()
      }
    ];
    
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
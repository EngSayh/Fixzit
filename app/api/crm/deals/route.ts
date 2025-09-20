import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const deals = [
      {
        id: '1',
        title: 'Al Olaya Tower Maintenance Contract',
        value: 450000,
        stage: 'negotiation',
        probability: 75,
        contact: 'Ahmed Al-Rashid',
        expectedClose: new Date(Date.now() + 30 * 86400000).toISOString()
      },
      {
        id: '2',
        title: 'Marina Residences Security Upgrade',
        value: 280000,
        stage: 'proposal',
        probability: 60,
        contact: 'Sara Al-Fahad',
        expectedClose: new Date(Date.now() + 45 * 86400000).toISOString()
      }
    ];
    
    return NextResponse.json(deals);
  } catch (error) {
    console.error('Error fetching deals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
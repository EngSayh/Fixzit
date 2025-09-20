import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const interactions = [
      {
        id: '1',
        type: 'email',
        subject: 'Re: Maintenance Contract Renewal',
        contact: 'Ahmed Al-Rashid',
        date: new Date(Date.now() - 86400000).toISOString(),
        summary: 'Discussed renewal terms and pricing'
      },
      {
        id: '2',
        type: 'meeting',
        subject: 'Property Tour - Marina Residences',
        contact: 'Sara Al-Fahad',
        date: new Date(Date.now() - 2 * 86400000).toISOString(),
        summary: 'Showed security upgrade options'
      }
    ];
    
    return NextResponse.json(interactions);
  } catch (error) {
    console.error('Error fetching interactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
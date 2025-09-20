import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://localhost:5000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // In production, this would save to the audit log
    console.log('Audit log:', {
      ...body,
      timestamp: new Date().toISOString(),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging audit event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
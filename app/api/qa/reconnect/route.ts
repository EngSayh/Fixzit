import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/src/lib/mongo';

export async function POST(req: NextRequest) {
  try {
    // Force database reconnection by accessing it
    await connectDb();
    console.log('🔄 Database reconnected successfully');

    return NextResponse.json({
      success: true,
      message: 'Database reconnected successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Database reconnection failed:', error);

    return NextResponse.json({
      success: false,
      error: 'Database reconnection failed',
      details: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

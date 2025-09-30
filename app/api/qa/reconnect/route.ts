import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from "@/src/lib/mongodb-unified";

export async function POST(req: NextRequest) {
  try {
    // Force database reconnection by accessing it
    await connectToDatabase();
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


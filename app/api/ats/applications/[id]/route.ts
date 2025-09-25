import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
// import { Application } from '@/src/server/models/Application';
import { getUserFromToken } from '@/src/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Temporary: ATS module not included in this build
    return NextResponse.json({ success: false, error: 'ATS Applications endpoint not available in this deployment' }, { status: 501 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch application' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Temporary: ATS module not included in this build
    return NextResponse.json({ success: false, error: 'ATS Applications endpoint not available in this deployment' }, { status: 501 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update application' }, { status: 500 });
  }
}



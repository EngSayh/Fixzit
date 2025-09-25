import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
// import { Application } from '@/src/server/models/Application';
// import { Candidate } from '@/src/server/models/Candidate';
// import { Job } from '@/src/server/models/Job';
// import { Employee } from '@/src/server/models/Employee';
import { getUserFromToken } from '@/src/lib/auth';

export async function POST(req: NextRequest) {
  try {
    // Temporary: ATS conversion not available in this deployment
    return NextResponse.json({ success: false, error: 'ATS conversion endpoint not available in this deployment' }, { status: 501 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to convert to employee' }, { status: 500 });
  }
}



import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
// import { Job } from '@/src/server/models/Job';
// import { Candidate } from '@/src/server/models/Candidate';
// import { Application } from '@/src/server/models/Application';
// import { AtsSettings } from '@/src/server/models/AtsSettings';
// import { scoreApplication, extractSkillsFromText, calculateExperienceFromText } from '@/src/lib/ats/scoring';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Temporary: ATS job application not available in this deployment
    return NextResponse.json(
      { success: false, error: 'ATS job application endpoint not available in this deployment' },
      { status: 501 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}



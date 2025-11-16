import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { Job } from '@/server/models/Job';
import { Candidate } from '@/server/models/Candidate';
import { Application } from '@/server/models/Application';
import { AtsSettings } from '@/server/models/AtsSettings';
import { scoreApplication, extractSkillsFromText, calculateExperienceFromText } from '@/lib/ats/scoring';
import { promises as fs } from 'fs';
import path from 'path';

import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError} from '@/server/utils/errorResponses';
import { getClientIP } from '@/server/security/headers';
import { logger } from '@/lib/logger';
/**
 * @openapi
 * /api/ats/jobs/[id]/apply:
 *   post:
 *     summary: ats/jobs/[id]/apply operations
 *     tags: [ats]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  const params = await props.params;
  try {
    await connectToDatabase();
    
    const formData = await req.formData();
    
    // Extract form fields
    let firstName = formData.get('firstName') as string | null;
    let lastName = formData.get('lastName') as string | null;
    const fullName = formData.get('fullName') as string | null;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const location = formData.get('location') as string;
    const coverLetter = formData.get('coverLetter') as string;
    const skills = formData.get('skills') as string;
    const experience = formData.get('experience') as string;
    const linkedin = formData.get('linkedin') as string;
    const resumeFile = formData.get('resume') as File;
    
    // Derive first/last from fullName if not provided
    if ((!firstName || !lastName) && fullName) {
      const parts = fullName.trim().split(/\s+/);
      const f = parts.shift() || '';
      const l = parts.join(' ') || 'NA';
      firstName = firstName || f;
      lastName = lastName || l;
    }

    // Validate required fields (ensure at least firstName/email/phone)
    if (!firstName || !email || !phone) {
      return NextResponse.json(
        { success: false, error: 'Required fields missing' },
        { status: 400 }
      );
    }
    
    // Get the job
    const job = await (Job as any).findById(params.id);
    
    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }
    
    if (job.status !== 'published') {
      return NextResponse.json(
        { success: false, error: 'Job is not accepting applications' },
        { status: 400 }
      );
    }
    
    // Process resume file (save to public/uploads/resumes)
    let resumeUrl = '';
    let resumeText = '';
    
    if (resumeFile) {
      try {
        const bytes = await resumeFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'resumes');
        await fs.mkdir(uploadDir, { recursive: true });
        const safeName = resumeFile.name.replace(/[^\w.-]+/g, '_');
        const fileName = `${Date.now()}-${safeName}`;
        const filePath = path.join(uploadDir, fileName);
        await fs.writeFile(filePath, buffer);
        resumeUrl = `/uploads/resumes/${fileName}`;
      } catch (err) {
        logger.error(
          'Resume save failed',
          err instanceof Error ? err : new Error(String(err)),
          { route: 'POST /api/ats/jobs/[id]/apply' }
        );
      }
      
      // Basic text surrogate for scoring/search
      resumeText = `${firstName || ''} ${lastName || ''} ${email} ${phone} ${skills || ''} ${coverLetter || ''}`.trim();
    }
    
    // Parse skills
    const candidateSkills = skills ? 
      skills.split(',').map((s: string) => s.trim()).filter(Boolean) : 
      extractSkillsFromText(resumeText + ' ' + coverLetter);
    
    // Parse experience
    const yearsOfExperience = experience ? 
      parseInt(experience, 10) : 
      calculateExperienceFromText(resumeText + ' ' + coverLetter);
    
    // Get ATS settings
    const atsSettings = await AtsSettings.findOrCreateForOrg(job.orgId);
    
    // Check for existing candidate
    let candidate = await Candidate.findByEmail(job.orgId, email);
    
    if (!candidate) {
      // Create new candidate
      candidate = await (Candidate as any).create({
        orgId: job.orgId,
        firstName: firstName!,
        lastName: lastName || 'NA',
        email,
        phone,
        location,
        linkedin,
        skills: candidateSkills,
        experience: yearsOfExperience,
        resumeUrl,
        resumeText,
        source: 'careers',
        consents: {
          privacy: true,
          contact: true,
          dataRetention: true
        }
      });
    } else {
      // Update existing candidate info
      candidate.skills = [...new Set([...candidate.skills, ...candidateSkills])];
      if (resumeUrl) candidate.resumeUrl = resumeUrl;
      if (resumeText) candidate.resumeText = resumeText;
      if (linkedin) candidate.linkedin = linkedin;
      await candidate.save();
    }
    
    if (!candidate) {
      return NextResponse.json(
        { success: false, error: 'Failed to create or find candidate' },
        { status: 500 }
      );
    }
    
    // Check for duplicate application
    const existingApplication = await (Application as any).findOne({
      orgId: job.orgId,
      jobId: job._id,
      candidateId: candidate._id
    });
    
    if (existingApplication) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'You have already applied for this position',
          applicationId: existingApplication._id
        },
        { status: 400 }
      );
    }
    
    // Score the application
    const score = scoreApplication({
      skills: candidateSkills,
      requiredSkills: job.skills,
      experience: yearsOfExperience,
      minExperience: job.screeningRules?.minYears
    }, atsSettings.scoringWeights || undefined);
    
    // Check knockout rules
    const knockoutCheck = atsSettings.shouldAutoReject({
      experience: yearsOfExperience,
      skills: candidateSkills
    });
    
    // Create application
    const application = await (Application as any).create({
      orgId: job.orgId,
      jobId: job._id,
      candidateId: candidate._id,
      stage: knockoutCheck.reject ? 'rejected' : 'applied',
      score,
      source: 'careers',
      candidateSnapshot: {
        fullName: `${firstName} ${lastName || ''}`.trim(),
        email,
        phone,
        location,
        skills: candidateSkills,
        experience: yearsOfExperience,
        resumeUrl
      },
      coverLetter,
      history: [{
        action: 'applied',
        by: 'candidate',
        at: new Date(),
        details: knockoutCheck.reject ? knockoutCheck.reason : undefined
      }]
    });
    
    // Update job application count
    await (Job as any).findByIdAndUpdate(job._id, { $inc: { applicationCount: 1 } });
    
    return NextResponse.json({ 
      success: true,
      data: {
        applicationId: application._id,
        status: application.stage,
        score,
        message: knockoutCheck.reject ? 
          'Your application has been received but does not meet the minimum requirements.' :
          'Your application has been successfully submitted!'
      }
    }, { status: 201 });
    
  } catch (error) {
    logger.error('Job application error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}



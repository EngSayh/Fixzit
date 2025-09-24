import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
import { Job } from '@/src/server/models/Job';
import { Candidate } from '@/src/server/models/Candidate';
import { Application } from '@/src/server/models/Application';
import { AtsSettings } from '@/src/server/models/AtsSettings';
import { scoreApplication, extractSkillsFromText, calculateExperienceFromText } from '@/src/lib/ats/scoring';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Handles POST submissions to apply for a job (saves candidate, scores application, creates Application).
 *
 * Parses multipart form data (candidate name, contact, resume file, skills, experience, cover letter, LinkedIn), derives missing name parts from `fullName`, validates required fields, saves an uploaded resume to public/uploads/resumes when provided, extracts skills and experience (from explicit fields or from text), finds or creates a Candidate record, prevents duplicate applications, computes a score using ATS settings, evaluates knockout rules (auto-reject), creates an Application record (with a candidate snapshot and history), increments the job's application count, and returns a JSON response describing the created application or any validation/errors.
 *
 * @param params - Route params object; expects `params.id` to be the target Job id.
 * @returns A NextResponse JSON payload. On success returns 201 with `{ success: true, data: { applicationId, status, score, message } }`. Possible error responses include 400 for missing fields or duplicate/invalid job state, 404 if the job isn't found, and 500 on internal errors.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db();
    
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

    // Validate required fields (ensure we always have a first name, last name can be 'NA')
    if (!firstName || !email || !phone) {
      return NextResponse.json(
        { success: false, error: 'Required fields missing' },
        { status: 400 }
      );
    }
    
    // Get the job
    const job = await Job.findById(params.id);
    
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
        const safeName = resumeFile.name.replace(/[^\w.\-]+/g, '_');
        const fileName = `${Date.now()}-${safeName}`;
        const filePath = path.join(uploadDir, fileName);
        await fs.writeFile(filePath, buffer);
        resumeUrl = `/uploads/resumes/${fileName}`;
      } catch (err) {
        // If file write fails, continue without resume but log
        console.error('Resume save failed:', err);
      }
      
      // Basic text surrogate for scoring/search (actual parsing can be added later)
      resumeText = `${firstName || ''} ${lastName || ''} ${email} ${phone} ${skills || ''} ${coverLetter || ''}`.trim();
    }
    
    // Parse skills
    const candidateSkills = skills ? 
      skills.split(',').map(s => s.trim()).filter(Boolean) : 
      extractSkillsFromText(resumeText + ' ' + coverLetter);
    
    // Parse experience
    const yearsOfExperience = experience ? 
      parseInt(experience) : 
      calculateExperienceFromText(resumeText + ' ' + coverLetter);
    
    // Get ATS settings
    const atsSettings = await AtsSettings.findOrCreateForOrg(job.orgId);
    
    // Check for existing candidate
    let candidate = await Candidate.findByEmail(job.orgId, email);
    
    if (!candidate) {
      // Create new candidate
      candidate = await Candidate.create({
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
    
    // Check for duplicate application
    const existingApplication = await Application.findOne({
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
    }, atsSettings.scoringWeights);
    
    // Check knockout rules
    const knockoutCheck = atsSettings.shouldAutoReject({
      experience: yearsOfExperience,
      skills: candidateSkills
    });
    
    // Create application
    const application = await Application.create({
      orgId: job.orgId,
      jobId: job._id,
      candidateId: candidate._id,
      stage: knockoutCheck.reject ? 'rejected' : 'applied',
      score,
      source: 'careers',
      candidateSnapshot: {
        fullName: `${firstName} ${lastName}`,
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
    await Job.findByIdAndUpdate(job._id, { $inc: { applicationCount: 1 } });
    
    // TODO: Send confirmation email
    // await emailService.sendApplicationConfirmation(candidate.email, job, application);
    
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
    console.error('Job application error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}
